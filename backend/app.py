from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv


app = Flask(__name__)
CORS(app)  # Enables frontend-backend connection


load_dotenv()  # Load the .env file
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

@app.route('/analyze_crop', methods=['POST'])
def analyze_crop():
    """
    Step-1: User uploads an image + query
    Step-2: Image is sent to Gemini Vision model
    Step-3: Model result is sent back to frontend
    """
    try:
        # Get uploaded image and user query
        image_file = request.files.get('image')
        user_query = request.form.get('query', 'Describe the crop condition.')

        if not image_file:
            return jsonify({"error": "No image uploaded"}), 400

        # Read image bytes
        image_bytes = image_file.read()

        # Send image + query to Gemini Vision model
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=image_file.mimetype or 'image/jpeg',
                ),
                user_query
            ]
        )

        return jsonify({
            "status": "success",
            "query": user_query,
            "result": response.text
        })

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
