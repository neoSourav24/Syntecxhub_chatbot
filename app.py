import re
import random
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static',
            static_url_path='/static')
CORS(app)

class DynamicChatbot:
    def __init__(self, name="AssistBot"):
        self.name = name
        self.conversation_history = []
        self.context = {}  # Store conversation context
        self.user_preferences = {}  # Store user preferences
        
        # Expanded knowledge base with synonyms and related terms
        self.knowledge_base = {
            "hours": {
                "responses": [
                    "🕒 We're open Mon-Fri: 9AM-6PM, Sat: 10AM-4PM, Sun: Closed",
                    "Our business hours are Monday to Friday 9AM-6PM, Saturday 10AM-4PM",
                    "You can visit us weekdays 9-6, Saturdays 10-4. We're closed Sundays!"
                ],
                "keywords": ["hours", "open", "close", "timing", "schedule", "when", "time", "opening", "closing"]
            },
            "location": {
                "responses": [
                    "📍 We're at Durgapur, West Bengal (near Cement Park)",
                    "Our address: 256 City Centre, Durgapur. Landmark: Cement Park",
                    "You can find us at 256 City Centre, right next to Cement Park!"
                ],
                "keywords": ["location", "address", "where", "place", "direction", "find", "located", "branch"]
            },
            "services": {
                "responses": [
                    "🛠️ We offer:\n• Customer Support\n• Technical Assistance\n• Product Information\n• Troubleshooting",
                    "Our services include customer support, technical help, and product info!",
                    "Need help? We provide customer service, technical support, and product guidance."
                ],
                "keywords": ["services", "offer", "provide", "do", "help", "support", "assistance"]
            },
            "contact": {
                "responses": [
                    "📞 Email: hacrrr.white37@gmail.com | Phone: 9800937440 | Live Chat: 24/7",
                    "You can reach us via email at hacrrr.white37@gmail.com or 9800937440",
                    "Contact options: Email (hacrrr.white37@gmail.com), Phone (9800937440), or Live Chat"
                ],
                "keywords": ["contact", "reach", "email", "phone", "call", "message", "get in touch"]
            },
            "products": {
                "responses": [
                    "🛍️ We sell electronics, accessories, and software. What interests you?",
                    "Our products include laptops, phones, accessories, and software solutions!",
                    "We have a wide range of electronics and accessories. Any specific category?"
                ],
                "keywords": ["product", "buy", "purchase", "sell", "item", "merchandise", "goods"]
            },
            "price": {
                "responses": [
                    "💰 Prices vary by product. What specific item are you interested in?",
                    "Our products range from Rs.10 to Rs.1000. Tell me what you're looking for!",
                    "I'd be happy to help with pricing! Which product caught your interest?"
                ],
                "keywords": ["price", "cost", "expensive", "cheap", "afford", "rate", "fee", "charge"]
            },
            "refund": {
                "responses": [
                    "💰 We offer 30-day returns with original receipt. Items must be unused.",
                    "Return policy: 30 days, original receipt required, items in original condition.",
                    "You can return items within 30 days of purchase. Just bring your receipt!"
                ],
                "keywords": ["refund", "return", "money back", "exchange", "replace", "cancel"]
            },
            "shipping": {
                "responses": [
                    "🚚 Free shipping over $50! Standard: 5-7 days, Express: 2-3 days",
                    "Shipping: Standard (5-7 days, free over $50), Express (2-3 days, $15)",
                    "We ship worldwide! Standard takes 5-7 days, Express 2-3 days."
                ],
                "keywords": ["shipping", "delivery", "ship", "send", "arrive", "courier", "post"]
            }
        }
        
        # Question patterns for dynamic responses
        self.question_patterns = {
            "what": r'\bwhat\b',
            "when": r'\bwhen\b',
            "where": r'\bwhere\b',
            "why": r'\bwhy\b',
            "how": r'\bhow\b',
            "who": r'\bwho\b',
            "which": r'\bwhich\b'
        }
        
        # Greeting variations
        self.greetings = [
            "Hello! 👋 How can I assist you today?",
            "Hi there! What can I help you with?",
            "Hey! Welcome to our support! How may I help?",
            "Greetings! I'm here to help. What's on your mind?",
            "Hello! Ready to assist you. What do you need help with?"
        ]
        
        # Farewell messages
        self.farewells = [
            "Goodbye! 👋 Feel free to come back anytime!",
            "Take care! Let me know if you need more help!",
            "Bye! Have a wonderful day!",
            "See you later! I'm always here if you need assistance!"
        ]
        
        # Default responses for unknown queries
        self.default_responses = [
            "I'm not sure I understand. Could you please rephrase that? 🤔",
            "That's an interesting question! Could you provide more details?",
            "I'm still learning about that. Can you ask in a different way?",
            "Hmm, I don't have an answer for that yet. Try asking about our hours, location, or services!",
            "I'd love to help, but I need more context. What specifically would you like to know?"
        ]
    
    def preprocess_text(self, text):
        """Basic text preprocessing"""
        text = text.lower()
        # Remove special characters but keep words
        text = re.sub(r'[^\w\s]', ' ', text)
        return text
    
    def extract_keywords(self, text):
        """Extract important keywords from text"""
        text = self.preprocess_text(text)
        words = text.split()
        # Remove common stop words
        stop_words = set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                         'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by'])
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        return keywords
    
    def detect_intent(self, user_input):
        """Detect the intent of user input"""
        user_input_lower = user_input.lower()
        
        # Check for greetings
        if any(word in user_input_lower for word in ['hello', 'hi', 'hey', 'greetings']):
            return 'greeting'
        
        # Check for farewells
        if any(word in user_input_lower for word in ['bye', 'goodbye', 'exit', 'quit']):
            return 'farewell'
        
        # Check for thanks
        if any(word in user_input_lower for word in ['thank', 'thanks', 'appreciate']):
            return 'thanks'
        
        # Check for help
        if any(word in user_input_lower for word in ['help', 'support', 'assist']):
            return 'help'
        
        # Check knowledge base
        for topic, info in self.knowledge_base.items():
            for keyword in info['keywords']:
                if keyword in user_input_lower:
                    return topic
        
        # Check if it's a question
        for q_type, pattern in self.question_patterns.items():
            if re.search(pattern, user_input_lower):
                return 'question'
        
        return 'unknown'
    
    def generate_response(self, user_input, intent):
        """Generate dynamic response based on intent"""
        
        if intent == 'greeting':
            return random.choice(self.greetings)
        
        elif intent == 'farewell':
            return random.choice(self.farewells), True
        
        elif intent == 'thanks':
            return random.choice([
                "You're welcome! 😊 Happy to help!",
                "My pleasure! Anything else I can assist with?",
                "Glad I could help! Let me know if you need anything else!"
            ])
        
        elif intent == 'help':
            return "I can help you with:\n" + \
                   "\n".join([f"• {topic.capitalize()}" for topic in self.knowledge_base.keys()]) + \
                   "\n\nWhat would you like to know about?"
        
        elif intent in self.knowledge_base:
            # Get random response from the topic
            return random.choice(self.knowledge_base[intent]['responses'])
        
        elif intent == 'question':
            # Handle questions dynamically
            keywords = self.extract_keywords(user_input)
            
            # Try to match keywords with knowledge base
            for topic, info in self.knowledge_base.items():
                if any(keyword in info['keywords'] for keyword in keywords):
                    return random.choice(info['responses'])
            
            # If no match, ask for clarification
            return "That's a good question! Could you be more specific? 🤔"
        
        else:
            # Generate contextual response for unknown intent
            keywords = self.extract_keywords(user_input)
            if keywords:
                return f"I see you're asking about '{' '.join(keywords[:3])}'. Could you tell me more about that? 🤔"
            else:
                return random.choice(self.default_responses)
    
    def get_response(self, user_input):
        """Main method to get response"""
        # Detect intent
        intent = self.detect_intent(user_input)
        
        # Generate response
        response = self.generate_response(user_input, intent)
        
        # Handle farewell tuple
        if isinstance(response, tuple):
            return response
        
        return response, False
    
    def log_conversation(self, user_input, bot_response):
        """Log conversation with context"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        intent = self.detect_intent(user_input)
        
        self.conversation_history.append({
            'timestamp': timestamp,
            'user': user_input,
            'bot': bot_response,
            'intent': intent
        })
        
        # Update context
        self.context['last_intent'] = intent
        self.context['last_topic'] = intent if intent in self.knowledge_base else None
        
        return self.conversation_history

# Create chatbot instance
chatbot = DynamicChatbot()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        print(f"Received: {user_message}")
        
        # Get response
        response, should_exit = chatbot.get_response(user_message)
        
        # Log conversation
        chatbot.log_conversation(user_message, response)
        
        return jsonify({
            'response': response,
            'should_exit': should_exit,
            'timestamp': datetime.now().strftime("%H:%M:%S")
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify({'history': chatbot.conversation_history[-10:]})

@app.route('/api/clear', methods=['POST'])
def clear_history():
    chatbot.conversation_history = []
    chatbot.context = {}
    return jsonify({'message': 'History cleared successfully'})

if __name__ == '__main__':
    print("="*50)
    print("🚀 Dynamic Chatbot Started!")
    print("📍 Access at: http://localhost:5000")
    print("="*50)
    app.run(debug=True, port=5000, host='0.0.0.0')