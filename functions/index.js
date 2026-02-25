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
      
      // Emotional tone detection
      const positiveWords = ['good', 'great', 'maintained', 'hopeful', 'willing'];
      const negativeWords = ['tough', 'hard', 'worried', 'sad', 'falling apart'];
      const neutralWords = ['going', 'expected', 'maintained'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      positiveWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        const matches = allText.match(regex);
        if (matches) positiveCount += matches.length;
      });
      
      negativeWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        const matches = allText.match(regex);
        if (matches) negativeCount += matches.length;
      });
      
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
      if (allText.includes('maintained')) {
        patterns.push("consistent effort to maintain the streak");
      }
      if (allText.includes('worried') || allText.includes('hard')) {
        patterns.push("concerns about external challenges");
      }
      if (allText.includes('trying') || allText.includes('keep')) {
        patterns.push("persistence despite difficulties");
      }
      
      // Build summary
      const summary = `
Reflection Analysis (${reflections.length} entries):

Emotional Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}

Key Patterns:
${patterns.map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n')}

Overall: You've documented ${reflections.length} reflections showing a journey with ups and downs. The entries reveal both determination to maintain your streak and acknowledgment of challenges faced along the way.
`.trim();

      console.log("Summary generated successfully!");

      return { summary };

    } catch (error) {
      console.error("Error:", error.message);
      throw new HttpsError(
        "internal",
        `Failed to generate summary: ${error.message}`
      );
    }
  }
);
