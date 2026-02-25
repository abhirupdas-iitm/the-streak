const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { defineSecret } = require("firebase-functions/params");

// Use Hugging Face API instead - FREE tier available!

const HF_API_KEY = defineSecret("HF_API_KEY");

exports.summarizeReflections = onCall(

  { secrets: [HF_API_KEY] },

  async (request) => {

    console.log("=== Function called ===");

    console.log("Auth present:", !!request.auth);

    // 1. Auth check

    if (!request.auth) {

      throw new HttpsError(

        "unauthenticated",

        "Authentication required."

      );

    }

    // 2. Input validation

    const reflections = request.data.reflections;

    console.log("Reflections count:", reflections?.length || 0);

    if (!Array.isArray(reflections) || reflections.length === 0) {

      throw new HttpsError(

        "invalid-argument",

        "No reflections provided."

      );

    }

    try {

      const apiKey = HF_API_KEY.value();

      console.log("API key present:", !!apiKey);

      const prompt = `Analyze these personal daily reflections and provide:

- Dominant emotional tone

- Recurring patterns

- Concise summary

Be neutral and analytical, no advice.

Reflections:

${reflections.join("\n---\n")}

Summary:`;

      console.log("Calling Hugging Face API...");

      

      // Using Hugging Face's free inference API

      const response = await fetch(

        "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",

        {

          method: "POST",

          headers: {

            "Authorization": `Bearer ${apiKey}`,

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            inputs: prompt,

            parameters: {

              max_new_tokens: 250,

              temperature: 0.7,

              return_full_text: false

            }

          })

        }

      );

      if (!response.ok) {

        const errorText = await response.text();

        console.error("API Error:", response.status, errorText);

        throw new Error(`API error: ${response.status} - ${errorText}`);

      }

      const data = await response.json();

      console.log("API call successful!");

      let summary = "";

      if (Array.isArray(data) && data[0]?.generated_text) {

        summary = data[0].generated_text.trim();

      } else if (data.generated_text) {

        summary = data.generated_text.trim();

      } else {

        throw new Error("Unexpected API response format");

      }

      console.log("Summary generated, length:", summary.length);

      return {

        summary: summary

      };

    } catch (error) {

      console.error("=== ERROR ===");

      console.error("Error message:", error.message);

      console.error("Full error:", error);

      

      throw new HttpsError(

        "internal",

        `Failed to generate summary: ${error.message}`

      );

    }

  }

);
