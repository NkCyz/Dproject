from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from datetime import datetime
import tempfile

# PDF样式配置
PDF_STYLES = {
    'title': {
        'name': 'ChineseTitle',
        'fontSize': 16,
        'alignment': 1,
        'spaceAfter': 12
    },
    'heading': {
        'name': 'ChineseHeading',
        'fontSize': 14,
        'alignment': 0,
        'spaceAfter': 10
    },
    'normal': {
        'name': 'ChineseNormal',
        'fontSize': 12,
        'alignment': 0,
        'spaceAfter': 8
    }
}

# 文本映射配置
TEXT_MAPPINGS = {
    'subject': {
        'math': 'Mathematics',
        'chinese': 'Chinese',
        'english': 'English'
    },
    'difficulty': {
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard'
    },
    'question_type': {
        'choice': 'Multiple Choice',
        'fill': 'Fill-in-the-blank',
        'answer': 'Free Response'
    }
}

def register_fonts():
    """注册字体"""
    try:
        # Try to register SimHei font
        pdfmetrics.registerFont(TTFont('SimHei', 'simhei.ttf'))
        return 'SimHei'
    except:
        # If SimHei is not available, use default font
        return 'Helvetica'

def create_styles(font_name):
    """创建PDF样式"""
    styles = getSampleStyleSheet()
    
    for style_key, style_config in PDF_STYLES.items():
        styles.add(
            ParagraphStyle(
                name=style_config['name'],
                fontName=font_name,
                fontSize=style_config['fontSize'],
                alignment=style_config['alignment'],
                spaceAfter=style_config['spaceAfter']
            )
        )
    
    return styles

def get_mapped_text(category, key):
    """通用文本映射函数"""
    return TEXT_MAPPINGS.get(category, {}).get(key, key)

# PDF export directory
PDF_DIR = os.path.join(os.path.dirname(__file__), 'pdfs')
os.makedirs(PDF_DIR, exist_ok=True)

def generate_pdf(questions):
    """Generate PDF file from questions"""
    if not questions:
        raise ValueError("No questions provided")

    # Create temp file
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    pdf_filename = f"question_set_{timestamp}.pdf"
    pdf_path = os.path.join(PDF_DIR, pdf_filename)
    
    # Register fonts and create styles
    font_name = register_fonts()
    styles = create_styles(font_name)
    
    # Create PDF document
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Create document content
    content = []
    
    # Add title
    first_question = questions[0]
    title_parts = [
        get_mapped_text('grade', first_question.get('grade')),
        get_mapped_text('subject', first_question.get('subject')),
        get_mapped_text('difficulty', first_question.get('difficulty')),
        get_mapped_text('question_type', first_question.get('type')),
        'Question Set'
    ]
    title = ' '.join(filter(None, title_parts))
    content.append(Paragraph(title, styles['ChineseTitle']))
    content.append(Spacer(1, 12))
    
    # Add generation info
    generation_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content.append(Paragraph(f"Generation Time: {generation_time}", styles['ChineseNormal']))
    content.append(Paragraph(f"Number of Questions: {len(questions)}", styles['ChineseNormal']))
    content.append(Spacer(1, 24))
    
    # Add all questions
    for i, q in enumerate(questions):
        # Question title
        question_title = f"{i+1}. {q['content']}"
        content.append(Paragraph(question_title, styles['ChineseNormal']))
        
        # Add answer and analysis if available
        if 'answer' in q:
            content.append(Paragraph(f"Answer: {q['answer']}", styles['ChineseNormal']))
        if 'analysis' in q:
            content.append(Paragraph(f"Analysis: {q['analysis']}", styles['ChineseNormal']))
            
        content.append(Spacer(1, 12))
    
    # Build PDF
    doc.build(content)
    
    return pdf_path

# Test
if __name__ == "__main__":
    # Simulate some test questions
    test_questions = [
        {
            "id": 1,
            "content": "1 + 1 = ?",
            "type": "choice",
            "grade": "1",
            "subject": "math",
            "difficulty": "easy"
        },
        {
            "id": 2,
            "content": "2 x 3 = ?",
            "type": "choice",
            "grade": "1",
            "subject": "math", 
            "difficulty": "easy"
        }
    ]
    
    pdf_path = generate_pdf(test_questions)
    print(f"PDF Generated: {pdf_path}") 