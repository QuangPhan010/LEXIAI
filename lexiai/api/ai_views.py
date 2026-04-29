import hashlib
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.cache import cache
import google.generativeai as genai

class AIProxyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = request.data.get('prompt')
        input_text = request.data.get('input_text')
        model_name = request.data.get('model', 'gemini-1.5-flash')
        api_key = request.data.get('api_key') # User can still provide their key
        
        if not prompt or not input_text:
            return Response({"error": "Prompt and input_text are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Create a unique cache key based on prompt and input
        # We hash the content to keep the key size manageable
        content_to_hash = f"{prompt}{input_text}{model_name}"
        cache_key = f"ai_cache_{hashlib.md5(content_to_hash.encode()).hexdigest()}"

        # Check cache
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response({"result": cached_response, "cached": True}, status=status.HTTP_200_OK)

        # If not in cache, call Gemini
        if not api_key:
            return Response({"error": "Gemini API Key is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            
            # Support for JSON output if requested in prompt
            generation_config = {}
            if "json" in prompt.lower():
                generation_config["response_mime_type"] = "application/json"

            response = model.generate_content(
                f"{prompt}\n\nINPUT:\n{input_text}",
                generation_config=generation_config
            )
            
            result_text = response.text
            
            # Save to cache for 24 hours
            cache.set(cache_key, result_text, 60 * 60 * 24)
            
            return Response({"result": result_text, "cached": False}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
