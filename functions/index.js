const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.summarizeReflections = onCall(
  async (request) => {

    console.log("=== Function called ===");

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
      // Simple rule-based analysis
      const allText = reflections.join(" ").toLowerCase();
      
      // Emotional tone detection with more words
      const positiveWords = ['good', 'great', 'maintained', 'hopeful', 'willing', 'happy', 'excited', 'amazing', 'wonderful', 'excellent', 'love', 'enjoyed', 'fun', 'awesome', 'better', 'best', 'nice', 'perfect'];
      const negativeWords = ['tough', 'hard', 'worried', 'sad', 'falling apart', 'difficult', 'struggle', 'anxious', 'stressed', 'overwhelmed', 'bad', 'terrible', 'hate', 'frustrated', 'worst', 'awful', 'horrible'];
      const neutralWords = ['going', 'expected', 'maintained', 'okay', 'fine', 'normal', 'usual', 'alright'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      
      positiveWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = allText.match(regex);
        if (matches) positiveCount += matches.length;
      });
      
      negativeWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = allText.match(regex);
        if (matches) negativeCount += matches.length;
      });
      
      neutralWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = allText.match(regex);
        if (matches) neutralCount += matches.length;
      });
      
      // Ensure at least some distribution
      if (positiveCount === 0 && negativeCount === 0 && neutralCount === 0) {
        neutralCount = 1;
      }
      
      let tone = "";
      if (positiveCount > negativeCount * 1.5) {
        tone = "predominantly positive";
      } else if (negativeCount > positiveCount * 1.5) {
        tone = "predominantly negative with signs of struggle";
      } else {
        tone = "mixed, with both hopeful and challenging moments";
      }
      
      // Pattern detection
      const patterns = [];
      if (allText.includes('maintained') || allText.includes('maintain')) {
        patterns.push("consistent effort to maintain the streak");
      }
      if (allText.includes('worried') || allText.includes('hard') || allText.includes('tough')) {
        patterns.push("concerns about external challenges");
      }
      if (allText.includes('trying') || allText.includes('keep') || allText.includes('willing')) {
        patterns.push("persistence despite difficulties");
      }
      if (allText.includes('work') || allText.includes('academic')) {
        patterns.push("focus on work/academic responsibilities");
      }
      
      // Build summary
      const summary = `
Emotional Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}

Key Patterns:
${patterns.length > 0 ? patterns.map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n') : '• No specific patterns detected'}

Overall: You've documented ${reflections.length} reflections showing a journey with ups and downs. The entries reveal both determination to maintain your streak and acknowledgment of challenges faced along the way.
`.trim();

      console.log("Summary generated successfully!");

      return { 
        summary,
        emotions: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount
        }
      };

    } catch (error) {
      console.error("Error:", error.message);
      throw new HttpsError(
        "internal",
        `Failed to generate summary: ${error.message}`
      );
    }
  }
);
