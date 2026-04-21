const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(5).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(5).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).min(3).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).min(7).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

function normalizeQuestionItem(item) {
    const questionText = typeof item === "string" ? item : (item?.question || "Question not generated")
    const lower = questionText.toLowerCase()

    const inferIntention = () => {
        if (lower.includes("jwt") || lower.includes("auth") || lower.includes("security")) {
            return "Evaluate security awareness and ability to implement safe authentication flows."
        }
        if (lower.includes("mongodb") || lower.includes("database") || lower.includes("query")) {
            return "Assess database design thinking and performance optimization skills."
        }
        if (lower.includes("react") || lower.includes("frontend") || lower.includes("ui")) {
            return "Measure frontend architecture knowledge and user-centric implementation skills."
        }
        if (lower.includes("node") || lower.includes("express") || lower.includes("api")) {
            return "Check backend fundamentals, API design quality, and scalability thinking."
        }
        if (lower.includes("conflict") || lower.includes("team") || lower.includes("disagree")) {
            return "Understand collaboration style, communication maturity, and conflict resolution ability."
        }
        if (lower.includes("bug") || lower.includes("issue") || lower.includes("problem")) {
            return "Verify debugging process, root-cause analysis, and ownership in production incidents."
        }
        if (lower.includes("deadline") || lower.includes("time") || lower.includes("pressure")) {
            return "Evaluate prioritization, time management, and delivery discipline under constraints."
        }
        return "Assess practical problem-solving, clarity of thought, and real-world engineering judgment."
    }

    const inferAnswer = () => {
        if (lower.includes("jwt") || lower.includes("auth") || lower.includes("security")) {
            return "Explain token lifecycle, secure cookie/storage choices, expiry and refresh strategy, and mention concrete hardening steps like rotation and revocation."
        }
        if (lower.includes("mongodb") || lower.includes("database") || lower.includes("query")) {
            return "Describe schema/index decisions, query optimization approach, and share one real example with measured performance improvement."
        }
        if (lower.includes("react") || lower.includes("frontend") || lower.includes("ui")) {
            return "Use a structured response covering component design, state management, performance trade-offs, and accessibility considerations from a real project."
        }
        if (lower.includes("node") || lower.includes("express") || lower.includes("api")) {
            return "Walk through architecture choices, error handling, validation, and monitoring. Include one production example and outcome."
        }
        if (lower.includes("conflict") || lower.includes("team") || lower.includes("disagree")) {
            return "Answer with STAR format: describe the conflict context, your communication approach, compromise, and the positive team/project result."
        }
        if (lower.includes("bug") || lower.includes("issue") || lower.includes("problem")) {
            return "Explain how you reproduced the issue, narrowed root cause, fixed safely, and prevented recurrence with tests or monitoring."
        }
        if (lower.includes("deadline") || lower.includes("time") || lower.includes("pressure")) {
            return "Share prioritization framework, trade-offs made, stakeholder communication, and final delivery impact."
        }
        return "Give a concise, example-driven response using STAR or problem-action-result format with measurable outcomes."
    }

    if (typeof item === "string") {
        return {
            question: questionText,
            intention: inferIntention(),
            answer: inferAnswer(),
        }
    }
    return {
        question: questionText,
        intention: item?.intention || inferIntention(),
        answer: item?.answer || inferAnswer(),
    }
}

function normalizeSkillGapItem(item) {
    if (typeof item === "string") {
        return { skill: item, severity: "medium" }
    }
    const severity = item?.severity
    return {
        skill: item?.skill || "Unspecified skill gap",
        severity: severity === "low" || severity === "medium" || severity === "high" ? severity : "medium",
    }
}

function normalizePreparationItem(item, index) {
    if (typeof item === "string") {
        return {
            day: index + 1,
            focus: item,
            tasks: [ "Revise key concepts", "Solve practical interview problems" ],
        }
    }
    const tasks = Array.isArray(item?.tasks) && item.tasks.length > 0
        ? item.tasks.map((task) => String(task))
        : [ "Revise key concepts", "Solve practical interview problems" ]

    return {
        day: Number(item?.day) || index + 1,
        focus: item?.focus || `Preparation Day ${index + 1}`,
        tasks,
    }
}

function normalizeInterviewReportPayload(raw) {
    const parsedScore = Number.parseFloat(
        String(raw?.matchScore ?? "")
            .replace("%", "")
            .trim()
    )
    const safeScore = Number.isFinite(parsedScore)
        ? Math.max(0, Math.min(100, parsedScore))
        : 70

    return {
        matchScore: safeScore,
        technicalQuestions: (Array.isArray(raw?.technicalQuestions) ? raw.technicalQuestions : []).map(normalizeQuestionItem),
        behavioralQuestions: (Array.isArray(raw?.behavioralQuestions) ? raw.behavioralQuestions : []).map(normalizeQuestionItem),
        skillGaps: (Array.isArray(raw?.skillGaps) ? raw.skillGaps : []).map(normalizeSkillGapItem),
        preparationPlan: (Array.isArray(raw?.preparationPlan) ? raw.preparationPlan : []).map(normalizePreparationItem),
        title: String(raw?.title || "Interview Preparation Report"),
    }
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        Strict output rules:
                        - Return valid JSON only (no markdown or extra text).
                        - Include these keys exactly: matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan, title.
                        - technicalQuestions must contain at least 5 items.
                        - behavioralQuestions must contain at least 5 items.
                        - skillGaps must contain at least 3 items.
                        - preparationPlan must contain exactly 7 items for day 1..7.
                        - Each preparationPlan.tasks must contain at least 2 tasks.
`

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    try {
        return interviewReportSchema.parse(JSON.parse(response.text))
    } catch {
        // Fallback: normalize loosely structured AI output (common with free models).
        const normalized = normalizeInterviewReportPayload(JSON.parse(response.text))
        return interviewReportSchema.parse(normalized)
    }


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }