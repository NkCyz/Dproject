from langchain_community.chat_models import ChatZhipuAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from dotenv import load_dotenv
import os
import json
import time
from tenacity import retry, stop_after_attempt, wait_exponential

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        os.environ["ZHIPUAI_API_KEY"] = "dee3b45cfac947b6bbd28db2370549dd.W4VRgOVj2ZoI8SFs"
        self.llm = ChatZhipuAI(
            model='glm-4-flash',
            temperature=0.7,
            max_retries=3,
            request_timeout=30
        )

        # Initialize conversation system
        self.conversation = ConversationChain(
            llm=self.llm,
            memory=ConversationBufferMemory(),
            verbose=True
        )

        # Define question generation prompt template
        self.question_template = """
        Please generate high-quality exam questions based on the following requirements:
        
        Topic: {topic}
        Difficulty Level: {difficulty} (ensure difficulty matches requirements)
        Question Type: {question_type}
        Number of Questions: {num_questions}
        
        Generation Requirements:
        1. Each question must include: question content, correct answer, detailed analysis
        2. Answer analysis should be clear and easy to understand, including solution steps
        3. Difficulty must match specified level
        4. Questions should have practical application value
        5. Format should be consistent, with clear separation between questions
        6. For Multiple Choice questions, must provide complete options A, B, C, D in the content field
        
        Please return in the following JSON format:
        {{
            "questions": [
                {{
                    "id": "1",
                    "content": "Question content (including all options A, B, C, D for multiple choice)",
                    "type": "Question type",
                    "options": ["Option A", "Option B", "Option C", "Option D"],  // Only for multiple choice
                    "answer": "Correct answer",
                    "analysis": "Detailed analysis"
                }},
                ...
            ]
        }}
        """
        
        # Create question generation Chain
        self.question_prompt = PromptTemplate(
            input_variables=["topic", "difficulty", "question_type", "num_questions"],
            template=self.question_template
        )
        self.question_chain = LLMChain(llm=self.llm, prompt=self.question_prompt)

    def _format_response(self, success, data=None, error=None):
        """Unified response formatting function"""
        response = {"success": success}
        if data is not None:
            response["data"] = data
        if error is not None:
            response["error"] = str(error)
        return response

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def _generate_questions_with_retry(self, params):
        """Question generation function with retry mechanism"""
        try:
            response = self.question_chain.run(params)
            return response
        except Exception as e:
            if "429" in str(e):
                print(f"Rate limit hit, waiting before retry... Error: {e}")
                time.sleep(5)  # Wait 5 seconds before retry
                raise e
            raise e

    def generate_questions(self, topic, difficulty, question_type, num_questions):
        """Generate exam questions using LangChain"""
        try:
            # Limit number of questions per generation
            if num_questions > 10:
                batches = []
                for i in range(0, num_questions, 10):
                    batch_size = min(10, num_questions - i)
                    params = {
                        "topic": topic,
                        "difficulty": difficulty,
                        "question_type": question_type,
                        "num_questions": batch_size
                    }
                    response = self._generate_questions_with_retry(params)
                    try:
                        questions = json.loads(response)
                        batches.extend(questions["questions"])
                        time.sleep(2)  # Add delay between batches
                    except json.JSONDecodeError:
                        continue
                
                return self._format_response(True, data=batches)
            else:
                params = {
                    "topic": topic,
                    "difficulty": difficulty,
                    "question_type": question_type,
                    "num_questions": num_questions
                }
                response = self._generate_questions_with_retry(params)
                try:
                    questions = json.loads(response)
                    return self._format_response(True, data=questions["questions"])
                except json.JSONDecodeError:
                    return self._format_response(True, data=response)
                
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                error_msg = "Server busy, please try again later (API rate limit)"
            return self._format_response(False, error=error_msg)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def analyze_answer(self, question, student_answer):
        """Analyze student's answer and provide detailed feedback"""
        analysis_template = f"""
        Please provide a professional educational assessment and feedback for the following student answer:
        
        Question: {question}
        Student Answer: {student_answer}
        
        Please provide analysis in the following aspects:
        1. Answer correctness evaluation (percentage)
        2. Knowledge point mastery analysis
        3. Existing problems and misconceptions
        4. Improvement suggestions and learning direction
        5. Related knowledge points extension
        
        Please return in the following JSON format:
        {{
            "correctness_percentage": "Correctness rate",
            "knowledge_mastery": "Knowledge point mastery",
            "issues": ["Issue 1", "Issue 2", ...],
            "suggestions": ["Suggestion 1", "Suggestion 2", ...],
            "related_knowledge": ["Related point 1", "Related point 2", ...]
        }}
        """
        
        try:
            response = self.llm.predict(analysis_template)
            try:
                analysis = json.loads(response)
                return self._format_response(True, data=analysis)
            except json.JSONDecodeError:
                return self._format_response(True, data=response)
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                error_msg = "Server busy, please try again later (API rate limit)"
            return self._format_response(False, error=error_msg)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def get_learning_suggestions(self, topic, student_performance):
        """Generate personalized learning suggestions based on student performance"""
        suggestion_template = f"""
        Please generate personalized learning suggestions based on the following information:
        
        Learning Topic: {topic}
        Student Performance: {student_performance}
        
        Please provide:
        1. Targeted learning strategies
        2. Recommended learning resources
        3. Time planning suggestions
        4. Practice method recommendations
        
        Please return in the following JSON format:
        {{
            "strategies": ["Strategy 1", "Strategy 2", ...],
            "resources": ["Resource 1", "Resource 2", ...],
            "time_planning": "Time planning suggestions",
            "practice_methods": ["Method 1", "Method 2", ...]
        }}
        """
        
        try:
            response = self.llm.predict(suggestion_template)
            try:
                suggestions = json.loads(response)
                return self._format_response(True, data=suggestions)
            except json.JSONDecodeError:
                return self._format_response(True, data=response)
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg:
                error_msg = "Server busy, please try again later (API rate limit)"
            return self._format_response(False, error=error_msg)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def chat(self, message):
        """Handle user chat messages"""
        try:
            # Define the desktop pet persona
            pet_persona = """
            You are the Desktop Pet for the Personalized Question Set Generator application.
            Your name is Qbot, and you're a helpful, friendly assistant specialized in educational content.
            You have these characteristics:
            1. You're knowledgeable about different school subjects and question formats
            2. You provide encouragement and motivation to users
            3. You can explain how to use the application features
            4. You're playful but professional
            
            IMPORTANT: You MUST ALWAYS respond in Chinese (Simplified Chinese), regardless of the language the user is using.
            All your responses should be in Chinese only. Never use English or any other language in your responses.
            
            Always identify yourself as the desktop pet/assistant for this application.
            Keep responses concise (under 3 sentences when possible) but helpful.
            """
            
            # Add persona to beginning of conversation if it's a new session
            if len(self.conversation.memory.chat_memory.messages) <= 2:
                self.conversation.memory.chat_memory.add_user_message(pet_persona)
            
            # Process the message with the conversation model
            response = self.conversation.predict(input=message)
            return self._format_response(True, data=response)
            
        except Exception as e:
            error_msg = f"Error in chat: {str(e)}"
            print(error_msg)
            return self._format_response(False, error=error_msg) 