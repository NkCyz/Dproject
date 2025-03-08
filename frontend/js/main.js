// Backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// DOM elements
const questionForm = document.getElementById('questionForm');
const loader = document.getElementById('loader');
const resultDiv = document.getElementById('result');
const questionOutput = document.getElementById('questionOutput');
const chatInput = document.getElementById('chatInput');
const chatBody = document.getElementById('chatBody');
const desktopPet = document.getElementById('desktopPet');
const chatContainer = document.getElementById('chatContainer');

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Form submission event
    questionForm.addEventListener('submit', handleFormSubmit);
    
    // Desktop pet click event
    if (desktopPet) {
    desktopPet.addEventListener('click', function() {
            if (chatContainer.style.display === 'flex') {
                chatContainer.style.display = 'none';
            } else {
                chatContainer.style.display = 'flex';
                // 如果是首次打开聊天，添加欢迎消息
                if (chatBody && chatBody.childElementCount === 0) {
                    appendMessage("你好！我是Qbot，你的题目生成助手！今天我能帮你做什么呢？", 'bot');
                }
            }
        });
    }
    
    // Chat input enter key event
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle form submission with debounce
const handleFormSubmit = debounce(async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        grade: document.getElementById('grade').value,
        subject: document.getElementById('subject').value,
        difficulty: document.getElementById('difficulty').value,
        questionType: document.getElementById('questionType').value,
        questionCount: parseInt(document.getElementById('questionCount').value)
    };
    
    // Validate form data
    if (!formData.grade || !formData.subject || !formData.difficulty || !formData.questionType) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    if (isNaN(formData.questionCount) || formData.questionCount < 1 || formData.questionCount > 50) {
        Swal.fire('Error', 'Number of questions must be between 1 and 50', 'error');
        return;
    }
    
    // Show loading animation
    loader.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        console.log('Sending request with data:', formData);
        
        // Send request to backend API
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        console.log('Received response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate questions');
        }
        
        // 处理响应数据
        let questionsData;
        if (typeof data === 'string') {
            // 如果返回的是JSON字符串
            try {
                const parsedData = JSON.parse(data);
                questionsData = parsedData.questions || [];
            } catch (error) {
                console.error('Error parsing response:', error);
                throw new Error('Invalid data format');
            }
        } else if (data.data) {
            // 如果返回的是包含data字段的对象
            questionsData = data.data;
        } else if (data.questions) {
            // 如果返回的是包含questions字段的对象
            questionsData = data.questions;
        } else {
            throw new Error('Invalid data format');
        }
        
        // Save questions to localStorage with metadata
        const saveData = {
            questions: questionsData,
            metadata: {
                grade: formData.grade,
                subject: formData.subject,
                difficulty: formData.difficulty,
                questionType: formData.questionType,
                generatedTime: new Date().toISOString()
            }
        };
        localStorage.setItem('lastGeneratedQuestions', JSON.stringify(saveData));
        
        // 重置结果区域
        resultDiv.style.opacity = '0';
        setTimeout(() => {
            // Display results
            displayQuestions(questionsData);
            
            // 动画显示结果区域
            resultDiv.classList.add('active');
            resultDiv.style.opacity = '1';
            
            // 滚动到结果区域
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // Show success message
        Swal.fire('Success', 'Questions generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', error.message, 'error');
    } finally {
        // Hide loading animation
        loader.style.display = 'none';
    }
}, 500);

// Display generated questions
function displayQuestions(questions) {
    console.log('Received questions data:', questions);
    
    if (!questions) {
        questionOutput.textContent = "No questions generated";
        return;
    }
    
    let questionsArray = [];
    
    // 处理不同的数据格式
    try {
        if (typeof questions === 'string') {
            // 尝试提取JSON代码块
            const jsonMatch = questions.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    // 预处理JSON字符串
                    let jsonStr = jsonMatch[1]
                        .replace(/\n/g, '')  // 移除换行符
                        .replace(/\r/g, '')  // 移除回车符
                        .replace(/\t/g, '')  // 移除制表符
                        .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
                        .replace(/\\/g, '\\\\') // 处理反斜杠
                        .replace(/\\n/g, '\\n') // 处理换行转义
                        .replace(/\\r/g, '\\r') // 处理回车转义
                        .replace(/\\t/g, '\\t'); // 处理制表符转义
                    
                    // 尝试解析完整的JSON
                    try {
                        const parsedData = JSON.parse(jsonStr);
                        if (parsedData.questions) {
                            questionsArray = parsedData.questions;
                        }
                    } catch (e) {
                        console.error('解析完整JSON失败，尝试提取questions数组:', e);
                        
                        // 尝试直接提取questions数组
                        const questionsMatch = jsonStr.match(/"questions"\s*:\s*(\[[\s\S]*?\])/);
                        if (questionsMatch && questionsMatch[1]) {
                            try {
                                questionsArray = JSON.parse(questionsMatch[1]);
                            } catch (e) {
                                console.error('解析questions数组失败:', e);
                                
                                // 如果还是失败，尝试手动解析数组
                                const items = questionsMatch[1].match(/\{[^{}]*\}/g);
                                if (items) {
                                    questionsArray = items.map(item => {
                                        try {
                                            return JSON.parse(item);
                                        } catch (e) {
                                            console.error('解析单个题目失败:', e);
                                            return null;
                                        }
                                    }).filter(item => item !== null);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('JSON预处理失败:', e);
                }
            }
        } else if (Array.isArray(questions)) {
            questionsArray = questions;
        } else if (questions.data) {
            if (typeof questions.data === 'string') {
                // 对data字段使用相同的处理逻辑
                const jsonMatch = questions.data.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        let jsonStr = jsonMatch[1]
                            .replace(/\n/g, '')
                            .replace(/\r/g, '')
                            .replace(/\t/g, '')
                            .replace(/\s+/g, ' ')
                            .replace(/\\/g, '\\\\')
                            .replace(/\\n/g, '\\n')
                            .replace(/\\r/g, '\\r')
                            .replace(/\\t/g, '\\t');
                        
                        const parsedData = JSON.parse(jsonStr);
                        if (parsedData.questions) {
                            questionsArray = parsedData.questions;
                        }
                    } catch (e) {
                        console.error('解析data字段失败:', e);
                    }
                }
            } else if (Array.isArray(questions.data)) {
                questionsArray = questions.data;
            }
        } else if (questions.questions) {
            questionsArray = questions.questions;
        }
    } catch (error) {
        console.error('处理题目数据时发生错误:', error);
    }
    
    console.log('解析后的题目数组:', questionsArray);
    
    if (questionsArray.length === 0) {
        questionOutput.textContent = "No questions generated";
        return;
    }
    
    // 使用HTML格式化显示结果，提高可读性
    let output = '<div class="question-container">';
    questionsArray.forEach((q, index) => {
        output += `<div class="question-item">`;
        output += `<h3>Question ${index + 1}</h3>`;
        
        // 处理题目内容，如果选项没有在content中，尝试添加选项
        let content = q.content || 'No content available';
        
        // 处理换行符和选项格式化
        if (q.type && q.type.includes('Multiple Choice')) {
            // 分离题目主干和选项
            let mainQuestion = content;
            
            // 如果content中包含选项，提取主题干
            const optionMatch = content.match(/^([\s\S]*?)(?=[A-D][.、：:：]|$)/);
            if (optionMatch) {
                mainQuestion = optionMatch[1].trim();
            }
            
            // 清理题目主干
            mainQuestion = mainQuestion
                .replace(/\\n/g, '')
                .replace(/\\/g, '')
                .trim();
            
            content = mainQuestion + '<br><br>';
            
            // 优先使用options数组，并确保不重复添加选项标签
            if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                q.options.forEach((option, i) => {
                    const label = String.fromCharCode(65 + i); // A, B, C, D...
                    // 移除选项前的标签（如"选项A."）并处理编码
                    const cleanOption = option
                        .replace(/^选项[A-D][.、：:：]?\s*/, '')
                        .replace(/^[A-D][.、：:：]?\s*/, '')
                        .replace(/\\n/g, '')
                        .replace(/\\/g, '')
                        .trim();
                    
                    // 添加可点击的选项并绑定事件
                    content += `<span class="option" data-question="${index + 1}" data-option="${label}" onclick="handleOptionClick(this)">${label}. ${cleanOption}</span><br>`;
                });
            } else {
                // 如果没有options数组，尝试从content中提取选项
                const optionsMatch = content.match(/[A-D][.、：:：][\s\S]*?(?=[A-D][.、：:：]|$)/g);
                if (optionsMatch) {
                    optionsMatch.forEach(option => {
                        const cleanOption = option
                            .replace(/\\n/g, '')
                            .replace(/\\/g, '')
                            .trim();
                        content += `<span class="option">${cleanOption}</span><br>`;
                    });
                }
            }
        }
        
        output += `<p class="question-content"><strong>Question:</strong>${content}</p>`;
        
        if (q.answer) {
            // 清理答案格式并处理编码
            const cleanAnswer = q.answer
                .replace(/^选项/, '')
                .replace(/\\n/g, '')
                .replace(/\\/g, '')
                .trim();
            output += `<p class="answer"><strong>Answer:</strong>${cleanAnswer}</p>`;
        }
        if (q.analysis) {
            // 清理和格式化解析内容并处理编码
            const cleanAnalysis = q.analysis
                .replace(/\\n/g, '<br>')
                .replace(/\\/g, '')
                .trim();
            output += `<p><strong>Analysis:</strong></p>`;
            output += `<div class="analysis-content-full">
                ${cleanAnalysis}
            </div>`;
        }
        output += `<hr/>`;
        output += `</div>`;
    });
    output += '</div>';
    
    // 显示结果
    questionOutput.innerHTML = output;
    resultDiv.style.display = 'block';
    
    // 确保结果区域是可见的
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // 更新图表数据
    if (window.myChart) {
        updateChart(document.getElementById('difficulty').value.toLowerCase());
    }
}

// Send message to desktop pet
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (message === '') return;
    
    // 显示用户消息
    appendMessage(message, 'user');
    chatInput.value = '';

    // 显示正在输入
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot typing';
    typingIndicator.textContent = '正在输入...';
    document.getElementById('chatBody').appendChild(typingIndicator);

    try {
        // 发送到后端AI服务
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        const responseData = await response.json();
        
        // 默认响应，如果API调用失败
        let botResponse = "抱歉，我无法处理您的请求。";
        
        if (responseData.success) {
            botResponse = responseData.data;
        }
        
        // 添加桌宠角色识别
        if (message.toLowerCase().includes('你是谁') || 
            message.toLowerCase().includes('who are you') || 
            message.toLowerCase().includes('what are you')) {
            botResponse = "你好！我是Qbot，您的个性化题目生成助手！我是这个应用程序的桌面宠物。我可以帮助您生成题目、解释功能，或者只是聊天解闷。今天我能为您的题目生成提供什么帮助呢？";
        }

        // 特殊处理：关于具体题目的提问
        if (message.includes('题') || message.includes('question') || 
            message.includes('不明白') || message.includes("don't understand") || 
            message.includes("confused") || message.includes('解释') || 
            message.includes('explain')) {
            
            const questionMatch = message.match(/(\d+)/);
            if (questionMatch) {
                const questionNumber = parseInt(questionMatch[1]);
                
                // 获取存储的题目数据
                const storedData = localStorage.getItem('lastGeneratedQuestions');
                if (storedData) {
                    try {
                        const parsedData = JSON.parse(storedData);
                        let questions = [];
                        
                        // 尝试提取题目数据
                        if (parsedData.questions && Array.isArray(parsedData.questions)) {
                            questions = parsedData.questions;
                        } else if (typeof parsedData.questions === 'string') {
                            // 提取JSON代码块
                            const jsonMatch = parsedData.questions.match(/```json\s*([\s\S]*?)\s*```/);
                            if (jsonMatch && jsonMatch[1]) {
                                try {
                                    const innerJson = JSON.parse(jsonMatch[1]);
                                    if (innerJson.questions && Array.isArray(innerJson.questions)) {
                                        questions = innerJson.questions;
                                    }
                                } catch (e) {
                                    console.error("解析内部JSON失败:", e);
                                }
                            }
                        }
                        
                        console.log(`找到${questions.length}道题目，尝试获取第${questionNumber}题`);
                        
                        // 如果找到题目，给出相关解释
                        if (questions.length >= questionNumber && questionNumber > 0) {
                            const targetQuestion = questions[questionNumber - 1];
                            console.log("找到目标题目:", targetQuestion);
                            
                            // 格式化题目内容，避免过长
                            let questionContent = targetQuestion.content || '';
                            if (questionContent.length > 100) {
                                questionContent = questionContent.substring(0, 100) + '...';
                            }
                            
                            botResponse = `我来给您解释第${questionNumber}题:\n\n`;
                            botResponse += `题目内容: ${questionContent}\n\n`;
                            botResponse += `正确答案: ${targetQuestion.answer || '未提供'}\n\n`;
                            botResponse += `解析: ${targetQuestion.analysis || '未提供解析'}`;
                        } else {
                            botResponse = `我找不到第${questionNumber}题。请确保该题目存在或尝试生成新的题目集。目前共有${questions.length}道题。`;
                        }
                    } catch (e) {
                        console.error('解析存储的题目数据时出错:', e);
                        botResponse = `抱歉，我在获取第${questionNumber}题的信息时遇到了问题: ${e.message}。请检查题目是否已生成，或者重新生成题目后再试。`;
                    }
                } else {
                    botResponse = "我没有看到任何已生成的题目。您想要我先帮您生成一些题目吗？";
                }
            }
        }
        
        // 移除"正在输入"指示器
        document.getElementById('chatBody').removeChild(typingIndicator);
        
        // 显示机器人消息
        appendMessage(botResponse, 'bot');
    } catch (error) {
        console.error('聊天发送失败:', error);
        document.getElementById('chatBody').removeChild(typingIndicator);
        appendMessage("抱歉，我连接到思考中枢时遇到了问题。请稍后再试！", 'bot');
    }
}

// Add message to chat box
function appendMessage(message, type) {
    const chatBody = document.getElementById('chatBody');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // 设置前缀和样式
    let formattedMessage = message;
    if (type === 'user') {
        formattedMessage = `You: ${message}`;
        messageDiv.style.textAlign = 'right';
        messageDiv.style.color = '#6c5ce7';
    } else if (type === 'bot') {
        formattedMessage = `Pet: ${message}`;
        messageDiv.style.textAlign = 'left';
        messageDiv.style.color = '#2d3436';
    }
    
    // 处理消息中的换行符，将\n转换为<br>
    if (type === 'bot') {
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        messageDiv.innerHTML = formattedMessage;
    } else {
        messageDiv.textContent = formattedMessage;
    }
    
    chatBody.appendChild(messageDiv);
    
    // 滚动到底部
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Export to PDF
async function exportToPDF() {
    let questions;
    let metadata;
    try {
        const storedData = localStorage.getItem('lastGeneratedQuestions');
        if (!storedData) {
            Swal.fire('Error', 'No questions available for export', 'error');
            return;
        }

        // 尝试解析存储的数据
        let parsedData;
        try {
            parsedData = JSON.parse(storedData);
            console.log('第一层解析的数据结构:', parsedData);
            
            // 如果questions是JSON字符串，需要进一步解析
            if (typeof parsedData.questions === 'string') {
                // 提取JSON代码块
                const jsonMatch = parsedData.questions.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        const innerJson = JSON.parse(jsonMatch[1]);
                        console.log('第二层解析的数据结构:', innerJson);
                        if (innerJson.questions && Array.isArray(innerJson.questions)) {
                            questions = innerJson.questions;
                            metadata = parsedData.metadata;
                        }
                    } catch (e) {
                        console.error('内层JSON解析失败:', e);
                        throw new Error('Unable to parse inner question data');
                    }
                }
            } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
                questions = parsedData.questions;
                metadata = parsedData.metadata;
            } else if (parsedData.data && Array.isArray(parsedData.data)) {
                questions = parsedData.data;
            } else if (Array.isArray(parsedData)) {
                questions = parsedData;
            } else {
                throw new Error('Invalid question data format');
            }
        } catch (e) {
            console.error('JSON解析失败:', e);
            throw new Error('Unable to parse question data');
        }

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            throw new Error('No questions available for export');
        }

        console.log('成功解析题目数据:', questions);
    } catch (error) {
        console.error('解析题目数据失败:', error);
        Swal.fire('Error', '解析题目数据失败: ' + error.message, 'error');
        return;
    }
    
    try {
        // 显示加载动画
        loader.style.display = 'block';
        
        // 准备PDF内容
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // 设置字体大小和样式
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        
        // 添加标题
        const title = metadata ? 
            `${getGradeText(metadata.grade)} ${getSubjectText(metadata.subject)} Question Set` :
            `${getGradeText(document.getElementById('grade').value)} ${getSubjectText(document.getElementById('subject').value)} Question Set`;
        doc.text(title, 105, 20, { align: 'center' });
        
        // 添加基本信息
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Difficulty: ${metadata ? getDifficultyText(metadata.difficulty) : getDifficultyText(document.getElementById('difficulty').value)}`, 20, 30);
        doc.text(`Type: ${metadata ? getTypeText(metadata.questionType) : getTypeText(document.getElementById('questionType').value)}`, 20, 35);
        doc.text(`Generated Time: ${metadata ? new Date(metadata.generatedTime).toLocaleString() : new Date().toLocaleString()}`, 20, 40);
        
        let yPos = 50;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const textWidth = pageWidth - 2 * margin;
        
        // 为每个问题添加内容
        questions.forEach((q, index) => {
            // 检查是否需要新页
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            
            // 添加题目编号
            doc.setFont('helvetica', 'bold');
            doc.text(`Question ${index + 1}`, margin, yPos);
            yPos += 7;
            
            // 添加题目内容
            doc.setFont('helvetica', 'normal');
            
            // 处理题目内容
            let content = q.content || '';
            if (q.type && q.type.includes('Multiple Choice') && q.options && Array.isArray(q.options)) {
                // 分离题目主干和选项
                let mainQuestion = content;
                const optionMatch = content.match(/^([\s\S]*?)(?=[A-D][.、：:：]|$)/);
                if (optionMatch) {
                    mainQuestion = optionMatch[1].trim();
                }
                
                content = mainQuestion + '\n\n';
                q.options.forEach((option, i) => {
                    const label = String.fromCharCode(65 + i);
                    // 清理选项文本
                    const cleanOption = option
                        .replace(/^选项[A-D][.、：:：]?\s*/, '')
                        .replace(/^[A-D][.、：:：]?\s*/, '')
                        .trim();
                    content += `${label}. ${cleanOption}\n`;
                });
            }
            
            // 使用splitTextToSize确保长文本正确换行
            const contentLines = doc.splitTextToSize(content, textWidth);
            doc.text(contentLines, margin, yPos);
            yPos += contentLines.length * 7;
            
            // 添加答案（如果有）
            if (q.answer) {
                yPos += 5;
                doc.setFont('helvetica', 'bold');
                doc.text('Answer:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const answerLines = doc.splitTextToSize(q.answer, textWidth);
                doc.text(answerLines, margin, yPos);
                yPos += answerLines.length * 7;
            }
            
            // 添加解析（如果有）
            if (q.analysis) {
                yPos += 5;
                doc.setFont('helvetica', 'bold');
                doc.text('Analysis:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const analysisLines = doc.splitTextToSize(q.analysis, textWidth);
                doc.text(analysisLines, margin, yPos);
                yPos += analysisLines.length * 7;
            }
            
            // 添加分隔线
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
            yPos += 10;
        });
        
        // 保存PDF
        doc.save(`Question Set_${new Date().toISOString().slice(0, 10)}.pdf`);
        
        // 显示成功消息
        Swal.fire('Success', 'PDF exported successfully!', 'success');
    } catch (error) {
        console.error('PDF导出错误:', error);
        Swal.fire('Error', '导出PDF失败: ' + error.message, 'error');
    } finally {
        // 隐藏加载动画
        loader.style.display = 'none';
    }
}

// Update chart data
function updateChart(difficulty) {
    const chart = window.myChart;
    if (!chart) return;
    
    // Get current data
    const currentData = chart.data.datasets[0].data;
    
    // Increase count based on difficulty
    if (difficulty === 'easy') {
        currentData[0] += 1;
    } else if (difficulty === 'medium') {
        currentData[1] += 1;
    } else if (difficulty === 'hard') {
        currentData[2] += 1;
    }
    
    // Update chart
    chart.update();
}

// Helper function: Get grade text
function getGradeText(grade) {
    const gradeMapping = {
        '1': 'Grade 1 (Elementary)',
        '2': 'Grade 2 (Elementary)',
        '3': 'Grade 3 (Elementary)',
        '4': 'Grade 4 (Elementary)',
        '5': 'Grade 5 (Elementary)',
        '6': 'Grade 6 (Elementary)',
        '7': 'Grade 7 (Middle School)',
        '8': 'Grade 8 (Middle School)',
        '9': 'Grade 9 (Middle School)',
    };
    
    return gradeMapping[grade] || `Grade ${grade}`;
}

// Helper function: Get subject text
function getSubjectText(subject) {
    const subjectMapping = {
        'math': 'Mathematics',
        'chinese': 'Chinese',
        'english': 'English',
    };
    
    return subjectMapping[subject] || subject;
}

// Helper function: Get difficulty text
function getDifficultyText(difficulty) {
    const difficultyMapping = {
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard',
    };
    
    return difficultyMapping[difficulty] || difficulty;
}

// Helper function: Get question type text
function getTypeText(questionType) {
    const typeMapping = {
        'choice': 'Multiple Choice',
        'fill': 'Fill-in-the-blank',
        'answer': 'Free Response',
    };
    
    return typeMapping[questionType] || questionType;
}

// 添加选项点击处理函数
function handleOptionClick(optionElement) {
    const questionNumber = optionElement.getAttribute('data-question');
    const selectedOption = optionElement.getAttribute('data-option');
    
    // 获取正确答案
    const storedData = localStorage.getItem('lastGeneratedQuestions');
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            let questions = [];
            
            // 尝试提取题目数据
            if (parsedData.questions && Array.isArray(parsedData.questions)) {
                questions = parsedData.questions;
            } else if (typeof parsedData.questions === 'string') {
                // 提取JSON代码块
                const jsonMatch = parsedData.questions.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        const innerJson = JSON.parse(jsonMatch[1]);
                        if (innerJson.questions && Array.isArray(innerJson.questions)) {
                            questions = innerJson.questions;
                        }
                    } catch (e) {
                        console.error("解析内部JSON失败:", e);
                    }
                }
            }
            
            // 如果找到题目，检查答案
            if (questions.length >= questionNumber && questionNumber > 0) {
                const targetQuestion = questions[questionNumber - 1];
                const correctAnswer = targetQuestion.answer;
                
                // 打开桌宠聊天窗口
                document.getElementById('chatContainer').style.display = 'flex';
                
                // 显示用户选择
                appendMessage(`我选择了第${questionNumber}题的${selectedOption}选项`, 'user');
                
                // 检查答案并给出反馈
                if (correctAnswer.includes(selectedOption)) {
                    appendMessage(`恭喜你答对了！${selectedOption}是正确答案。\n\n${targetQuestion.analysis || ''}`, 'bot');
                } else {
                    appendMessage(`你选择的是${selectedOption}，但正确答案是${correctAnswer}。\n\n${targetQuestion.analysis || ''}`, 'bot');
                }
            }
        } catch (e) {
            console.error('解析存储的题目数据时出错:', e);
        }
    }
} 