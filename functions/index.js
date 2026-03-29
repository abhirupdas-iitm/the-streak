const { onCall, HttpsError } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

// ── Security alert: notify user of unauthorized login attempt ──
exports.notifyUnauthorizedAccess = onCall(async (request) => {
  const email = request.data?.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  // Use Firebase Functions config or environment variables for SMTP credentials.
  // Set with:  firebase functions:secrets:set GMAIL_USER  and  GMAIL_PASS
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    console.error("GMAIL_USER / GMAIL_PASS secrets not configured.");
    throw new HttpsError("internal", "Email service not configured.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const mailOptions = {
    from: `"The Streak Tracker" <${gmailUser}>`,
    to: email,
    subject: "⚠️ Security Alert — Unauthorized Access Attempt",
    text: `Hi,\n\nSomeone tried to access your Streak Tracker account (${email}) with an incorrect password.\n\nIf this was you, you can ignore this message. If not, we recommend changing your password immediately using the "Forgot Password?" option on the login page.\n\nStay safe,\nThe Streak Tracker`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#e53e3e;">⚠️ Security Alert</h2>
        <p>Someone tried to get access to your <strong>Streak Tracker</strong> account (<code>${email}</code>) using an incorrect password.</p>
        <p>If this was <strong>you</strong>, you can safely ignore this message.</p>
        <p>If this was <strong>not you</strong>, please reset your password immediately:</p>
        <p style="text-align:center;">
          <a href="https://the-streak2.firebaseapp.com" style="background:#e53e3e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Reset My Password</a>
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;">This is an automated security notification from The Streak Tracker.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Security alert sent to ${email}`);
    return { success: true };
  } catch (err) {
    console.error("Failed to send security alert email:", err);
    throw new HttpsError("internal", "Failed to send notification email.");
  }
});


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
      // ── Positive: only clearly upbeat, energetic, or affirming expressions ──
      const positiveWords = [
        'happy', 'excited', 'amazing', 'wonderful', 'excellent', 'love', 'loved',
        'enjoyed', 'fun', 'awesome', 'fantastic', 'great', 'proud',
        'grateful', 'thrilled', 'motivated', 'energized', 'confident', 'joyful',
        'refreshed', 'accomplished', 'inspired', 'optimistic', 'peaceful', 'content',
        'productive', 'fulfilling', 'rewarding', 'blessed', 'cheerful', 'pumped',
        'brilliant', 'delighted', 'ecstatic', 'elated', 'enthusiastic', 'hopeful',
        'pleased', 'relieved', 'satisfied', 'calm', 'focused', 'clear-headed',
        'on track', 'making progress', 'doing well', 'going well', 'feeling good',
        'feeling great', "couldn't be better", 'killing it'
      ];

      // ── Negative single words: only clearly distressed / unambiguous terms ──
      // Removed common ambiguous words: hard, tired, low, off, alone, lost, weak,
      // ill, sick, uncertain, doubt, broken, bored, mediocre, blah, meh, etc.
      const negativeWords = [
        'worried', 'worry', 'worrying', 'sad', 'struggle', 'struggling',
        'anxious', 'anxiety', 'stressed', 'stress', 'overwhelmed', 'terrible',
        'hate', 'hated', 'frustrated', 'frustrating', 'frustration', 'worst',
        'awful', 'horrible', 'exhausted', 'drained', 'burnout', 'hopeless',
        'miserable', 'angry', 'upset', 'disappointed', 'disappointing',
        'disappointment', 'failing', 'failed', 'failure', 'unmotivated',
        'demotivated', 'depressed', 'depression', 'bleak', 'painful',
        'regret', 'regretted', 'embarrassed', 'shame', 'ashamed', 'guilty',
        'guilt', 'irritated', 'irritating', 'annoyed', 'annoying', 'isolated',
        'helpless', 'powerless', 'stuck', 'trapped', 'overwhelm', 'dread',
        'dreading', 'afraid', 'scared', 'unsatisfied', 'unfulfilled', 'unhappy',
        'unproductive', 'procrastinated', 'procrastinating', 'procrastination',
        'lethargic', 'lethargy', 'unwell', 'wasted', 'useless', 'pointless',
        'meaningless', 'worthless', 'insecure', 'distracted', 'demotivating',
        'numb', 'empty', 'hollow', 'disconnected', 'unmotivating', 'shattered',
        'crying', 'cried', 'tears', 'disappointingly', 'neglected', 'neglect',
        'regretting', 'regretful', 'gloomy', 'apathetic', 'apathy', 'stagnant',
        'stagnating'
      ];

      // ── Negative multi-word phrases (matched with plain includes) ──
      const negativePhrases = [
        'falling apart', 'burnt out', 'burned out', 'not good', 'not great',
        'not okay', 'not fine', 'not well', 'not doing well', 'not feeling well',
        'not feeling great', 'not feeling good', 'not motivated', 'not productive',
        "can't focus", 'cannot focus', "couldn't focus", "can't concentrate",
        "couldn't sleep", "can't sleep", "didn't do much", "didn't do anything",
        "didn't feel like", "don't feel like", 'not in the mood',
        'bad day', 'rough day', 'hard day', 'tough day', 'difficult day',
        'worst day', 'terrible day', 'feel like giving up', 'want to give up',
        'wanted to give up', 'gave up', "don't care", "don't want to",
        "didn't want to", 'no energy', 'very tired', 'really tired', 'so tired',
        'barely managed', 'barely did', 'barely keeping',
        'fell behind', 'way behind', 'so behind', 'getting worse', 'feel worse',
        'feeling worse', 'feeling low', 'feeling down', 'feeling bad', 'feeling sad',
        'feeling anxious', 'feeling stressed', 'feeling overwhelmed', 'feeling lost',
        'feel lost', 'feel overwhelmed', 'feel stressed', 'feel anxious', 'feel sad',
        'feel bad', 'feel down', 'feel low', 'feel terrible', 'feel awful',
        'feel horrible', 'feel empty', 'feel hopeless', 'feel numb', 'feel stuck',
        'so stressed', 'very stressed', 'really stressed', 'so anxious',
        'so overwhelmed', 'totally drained', 'completely drained', 'absolutely exhausted',
        'really struggling', 'not happy', 'not satisfied', 'not doing enough',
        'wasted the day', 'wasted my day', 'wasted time', 'wasted today',
        'could have done better', "could've done better", 'should have done more',
        "should've done more", 'let myself down', 'let everyone down',
        'missed the mark', "didn't meet", "didn't hit", "didn't achieve",
        "wasn't productive", 'was not productive', 'not my best', 'below my best',
        'off my game', 'not at my best', 'out of it', 'going nowhere',
        'running on empty', 'out of energy'
      ];

      const neutralWords = [
        'okay', 'fine', 'normal', 'usual', 'alright', 'average', 'moderate',
        'maintained', 'going', 'expected', 'regular', 'standard', 'so-so', 'decent'
      ];

      // ── Score each reflection individually, then sum ──
      // This prevents one old bad-day entry from skewing the whole range.
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;

      reflections.forEach(reflection => {
        const text = reflection.toLowerCase();
        let pos = 0, neg = 0, neu = 0;

        positiveWords.forEach(word => {
          if (word.includes(' ')) {
            if (text.includes(word)) pos++;
          } else {
            const regex = new RegExp('\\b' + word.replace(/[-']/g, '\\$&') + '\\b', 'gi');
            const matches = text.match(regex);
            if (matches) pos += matches.length;
          }
        });

        negativeWords.forEach(word => {
          const regex = new RegExp('\\b' + word.replace(/[-']/g, '\\$&') + '\\b', 'gi');
          const matches = text.match(regex);
          if (matches) neg += matches.length;
        });

        negativePhrases.forEach(phrase => {
          if (text.includes(phrase)) neg += 2;
        });

        neutralWords.forEach(word => {
          const regex = new RegExp('\\b' + word.replace(/[-']/g, '\\$&') + '\\b', 'gi');
          const matches = text.match(regex);
          if (matches) neu += matches.length;
        });

        positiveCount += pos;
        negativeCount += neg;
        neutralCount += neu;
      });

      // Ensure at least some distribution
      if (positiveCount === 0 && negativeCount === 0 && neutralCount === 0) {
        neutralCount = 1;
      }

      // ── Thresholds (corrected for positive bias) ──
      // Positive: must dominate by 2.5x AND beat neutral — strong bar
      // Negative: only needs a small 10% edge over positive to be flagged
      // Mixed-negative: kicks in at near-parity (negative ≥ 70% of positive)
      let tone = "";
      let toneKey = "";
      if (positiveCount > negativeCount * 1.5 && positiveCount > neutralCount) {
        tone = "predominantly positive";
        toneKey = "positive";
      } else if (negativeCount > positiveCount * 1.1) {
        tone = "predominantly negative, showing signs of stress or struggle";
        toneKey = "negative";
      } else if (negativeCount > 0 && negativeCount >= positiveCount * 0.7) {
        tone = "mixed, leaning somewhat negative — with challenges present";
        toneKey = "mixed-negative";
      } else {
        tone = "mixed, with both hopeful and challenging moments";
        toneKey = "mixed";
      }
      
      // Pattern detection
      const allText = reflections.join(' ').toLowerCase();
      const patterns = [];
      if (allText.includes('maintained') || allText.includes('maintain')) {
        patterns.push("effort to maintain consistency");
      }
      if (allText.includes('worried') || allText.includes('worry') || allText.includes('hard') || allText.includes('tough') || allText.includes('rough')) {
        patterns.push("concerns or external pressures weighing on you");
      }
      if (allText.includes('trying') || allText.includes('keep') || allText.includes('keep going')) {
        patterns.push("persistence despite difficulties");
      }
      if (allText.includes('work') || allText.includes('academic') || allText.includes('study') || allText.includes('exam')) {
        patterns.push("focus on work or academic responsibilities");
      }
      if (allText.includes('tired') || allText.includes('exhausted') || allText.includes('drained') || allText.includes('burnt out')) {
        patterns.push("signs of fatigue or burnout");
      }
      if (allText.includes('happy') || allText.includes('excited') || allText.includes('motivated') || allText.includes('proud')) {
        patterns.push("moments of genuine positivity and motivation");
      }
      
      // Overall summary line that honestly reflects the tone
      let overallLine = "";
      if (toneKey === "positive") {
        overallLine = `Your reflections carry a genuinely uplifting energy. Keep riding this momentum — it's clear you're in a good headspace.`;
      } else if (toneKey === "negative") {
        overallLine = `Your reflections suggest you've been going through a tough stretch. It's okay to acknowledge that things are hard — recognizing it is the first step.`;
      } else if (toneKey === "mixed-negative") {
        overallLine = `Your reflections show a mix of effort and strain. While you're pushing through, there are signs that things have been weighing on you — don't ignore those feelings.`;
      } else {
        overallLine = `Your reflections show a balanced journey — some days better than others. Stay consistent and keep checking in with yourself.`;
      }
      
      // Build summary
      const summary = `
Emotional Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}

Key Patterns:
${patterns.length > 0 ? patterns.map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n') : '• No specific patterns detected'}

Overall (${reflections.length} reflection${reflections.length !== 1 ? 's' : ''} analyzed): ${overallLine}
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
