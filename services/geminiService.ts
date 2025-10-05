
import { GoogleGenAI, Type } from '@google/genai';
import type { Article } from '../types';

if (!process.env.API_KEY) {
    // This is a placeholder for development. The build environment will have the real key.
    // This is a common pattern for tools that inject env variables at build time.
    process.env.API_KEY = "YOUR_API_KEY_HERE";
}


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function generateTagsForFeed(
  feedTitle: string,
  feedDescription: string,
  articles: Pick<Article, 'title'>[]
): Promise<string[]> {
  try {
    const articleTitles = articles.map(a => a.title).join(', ');
    const prompt = `
      Based on this RSS feed information:
      - Title: "${feedTitle}"
      - Description: "${feedDescription}"
      - Recent article titles: "${articleTitles}"
      
      Generate 3 to 5 relevant, one-word, lowercase tags that categorize this feed.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'An array of 3-5 one-word, lowercase tags.',
            },
          },
        },
      },
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    return result.tags || [];
  } catch (error) {
    console.error("Error generating tags with Gemini:", error);
    // Return some default tags on failure
    return ["general", "news"];
  }
}


export async function generateDashboardInsights(
  articleTitles: string[]
): Promise<{ summary: string; trends: { topic: string; count: number }[] }> {
    try {
        const prompt = `
        Analyze these recent news headlines:
        ${articleTitles.map(title => `- "${title}"`).join('\n')}

        1.  Provide a concise, engaging summary (3-4 sentences) of the most important news stories.
        2.  Identify the top 5 most frequently mentioned topics or keywords. Count their occurrences.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: {
                            type: Type.STRING,
                            description: "A 3-4 sentence summary of the main news stories."
                        },
                        trends: {
                            type: Type.ARRAY,
                            description: "An array of the top 5 trending topics.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    topic: {
                                        type: Type.STRING,
                                        description: "The trending topic or keyword."
                                    },
                                    count: {
                                        type: Type.INTEGER,
                                        description: "The number of times the topic was mentioned."
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);

        // Sort trends by count descending
        if (result.trends) {
            result.trends.sort((a: {count: number}, b: {count: number}) => b.count - a.count);
        }
        
        return result || { summary: "No summary available.", trends: [] };

    } catch (error) {
        console.error("Error generating dashboard insights with Gemini:", error);
        throw new Error("Failed to generate AI insights.");
    }
}
