from flask import Flask, request, jsonify, render_template, send_file, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import json
from ai_service import AIService
from pdf_generator import generate_pdf
from functools import lru_cache
from datetime import datetime, timedelta
import time

# Initialize Flask application and AI service
app = Flask(__name__, 
            static_folder="../frontend",
            static_url_path='',
            template_folder="../frontend")
CORS(app)  # Enable CORS support

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Serve favicon.ico
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, '../frontend/assets'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Initialize AI service
ai_service = AIService()

# Use LRU cache decorator to cache generated questions
@lru_cache(maxsize=100)
def generate_questions_cached(topic, difficulty, question_type, num_questions):
    """Generate and cache questions based on parameters"""
    try:
        result = ai_service.generate_questions(
            topic=topic,
            difficulty=difficulty,
            question_type=question_type,
            num_questions=num_questions
        )
        
        # Check returned data structure
        print(f"AI service returned: {result}")
        
        return result
    except Exception as e:
        print(f"Error in generate_questions_cached: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.route('/')
def index():
    """Return homepage"""
    return render_template('home.html')

@app.route('/api/generate', methods=['POST'])
@limiter.limit("10 per minute")  # Limit to 10 requests per minute
def generate():
    """Generate questions based on parameters"""
    try:
        # Get parameters from request
        data = request.get_json()
        grade = data.get('grade')
        subject = data.get('subject')
        difficulty = data.get('difficulty')
        question_type = data.get('questionType')
        question_count = int(data.get('questionCount', 10))
        
        # Parameter validation
        if not all([grade, subject, difficulty, question_type]):
            return jsonify({"success": False, "error": "Please provide all required parameters"}), 400
        
        if question_count < 1 or question_count > 50:
            return jsonify({"success": False, "error": "Number of questions must be between 1 and 50"}), 400
        
        # Build topic
        topic = f"Grade {grade} {subject}"
        
        print(f"Generating questions with parameters: topic={topic}, difficulty={difficulty}, type={question_type}, count={question_count}")
        
        # Use cached generation function
        result = generate_questions_cached(
            topic=topic,
            difficulty=difficulty,
            question_type=question_type,
            num_questions=question_count
        )
        
        print(f"Generated result: {result}")
        
        if not result["success"]:
            return jsonify(result), 500
        
        # Ensure correct response format
        response_data = {
            "success": True,
            "data": result.get("data", [])
        }
        
        print(f"Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/export-pdf', methods=['POST'])
def export_pdf():
    """Export questions as PDF"""
    try:
        data = request.get_json()
        questions = data.get('questions')
        
        if not questions:
            return jsonify({"error": "No question data provided"}), 400
        
        # Generate PDF file
        pdf_path = generate_pdf(questions)
        
        # Return PDF file
        return send_file(pdf_path, as_attachment=True, download_name="question_set.pdf")
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Process chat messages and return AI responses"""
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"success": False, "error": "Please provide a message"}), 400
            
        message = data['message']
        print(f"Received chat message: {message}")
        
        # Use AI service to process the message
        result = ai_service.chat(message)
        print(f"AI response: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analyze-answer', methods=['POST'])
def analyze_answer():
    """Analyze student answer"""
    try:
        data = request.get_json()
        question = data.get('question')
        student_answer = data.get('answer')
        
        if not all([question, student_answer]):
            return jsonify({"error": "Please provide both question and answer"}), 400
        
        # Use AI service to analyze answer
        result = ai_service.analyze_answer(question, student_answer)
        
        if not result["success"]:
            return jsonify({"error": result["error"]}), 500
        
        return jsonify({
            "success": True,
            "analysis": result["analysis"]
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 