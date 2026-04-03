import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import MiniNavbar from "../components/MiniNavbar";

const SECTION_OPTIONS = [
  { id: "aptitude", title: "Aptitude", mode: "mcq", description: "Quantitative practice with arithmetic, percentage, ratio, averages, and data questions." },
  { id: "reasoning", title: "Reasoning", mode: "mcq", description: "Series, coding-decoding, analogy, arrangement, and logic-based questions." },
  { id: "verbal", title: "Qualitative / Verbal", mode: "mcq", description: "Vocabulary, grammar, fill-in-the-blanks, punctuation, and comprehension practice." },
  { id: "coding_easy", title: "Easy Coding", mode: "coding", description: "One beginner DSA-style coding problem with a 10 minute timer.", timerMinutes: 10 },
  { id: "coding_advanced", title: "Advanced Coding", mode: "coding", description: "One advanced DSA-style coding problem with a 15 minute timer.", timerMinutes: 15 },
];

const QUESTION_BANKS = {
  aptitude: [
    { question: "What is 15% of 240?", options: ["24", "30", "36", "42"], answer: "36" },
    { question: "A shop gives 20% discount on Rs. 500. What is the selling price?", options: ["Rs. 350", "Rs. 380", "Rs. 400", "Rs. 420"], answer: "Rs. 400" },
    { question: "If 8 workers finish a task in 12 days, how many days will 6 workers take?", options: ["14", "16", "18", "20"], answer: "16" },
    { question: "The average of 12, 18, 20, and 30 is:", options: ["18", "20", "22", "24"], answer: "20" },
    { question: "A train travels 180 km in 3 hours. What is its speed?", options: ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], answer: "60 km/h" },
    { question: "What is the ratio of 45 to 60?", options: ["3:4", "4:5", "5:6", "6:7"], answer: "3:4" },
    { question: "If x + 12 = 29, the value of x is:", options: ["15", "16", "17", "18"], answer: "17" },
    { question: "What is the simple interest on Rs. 1000 for 2 years at 5% per year?", options: ["Rs. 50", "Rs. 75", "Rs. 100", "Rs. 120"], answer: "Rs. 100" },
    { question: "A number increased by 25% becomes 250. The original number is:", options: ["180", "190", "200", "220"], answer: "200" },
    { question: "What is 3/4 of 84?", options: ["56", "60", "63", "66"], answer: "63" },
    { question: "If a pen costs Rs. 18, what will be the cost of 12 pens?", options: ["Rs. 196", "Rs. 204", "Rs. 216", "Rs. 224"], answer: "Rs. 216" },
    { question: "A car uses 8 liters of petrol for 96 km. How much does it use for 120 km?", options: ["9 liters", "10 liters", "11 liters", "12 liters"], answer: "10 liters" },
    { question: "The perimeter of a square is 48 cm. What is one side?", options: ["10 cm", "12 cm", "14 cm", "16 cm"], answer: "12 cm" },
    { question: "What is 18 squared?", options: ["288", "304", "324", "342"], answer: "324" },
    { question: "If 5 notebooks cost Rs. 125, what is the cost of 8 notebooks?", options: ["Rs. 180", "Rs. 190", "Rs. 200", "Rs. 210"], answer: "Rs. 200" },
    { question: "What is 40% of 350?", options: ["120", "130", "140", "150"], answer: "140" },
    { question: "A man buys an item for Rs. 800 and sells it for Rs. 920. Profit percentage is:", options: ["10%", "12%", "15%", "20%"], answer: "15%" },
    { question: "If 12 men can build a wall in 15 days, how many men are needed to do it in 9 days?", options: ["16", "18", "20", "22"], answer: "20" },
    { question: "What is the value of 7 x 8 - 9?", options: ["45", "47", "49", "51"], answer: "47" },
    { question: "A sum doubles itself in 8 years at simple interest. What is the annual rate?", options: ["10%", "12.5%", "15%", "8%"], answer: "12.5%" },
    { question: "If 25% of a number is 75, the number is:", options: ["250", "275", "300", "325"], answer: "300" },
    { question: "What is the area of a rectangle with length 15 cm and breadth 8 cm?", options: ["100", "110", "120", "130"], answer: "120" },
    { question: "A student scores 72, 68, and 80 in three tests. What average is needed in the fourth test to make the overall average 75?", options: ["76", "78", "80", "82"], answer: "80" },
    { question: "What is the next number: 5, 10, 20, 40, ?", options: ["60", "70", "80", "90"], answer: "80" },
    { question: "If a bike covers 150 km using 5 liters of fuel, how many liters for 270 km?", options: ["7", "8", "9", "10"], answer: "9" },
    { question: "The price of a shirt after 10% discount is Rs. 540. Original price was:", options: ["Rs. 580", "Rs. 600", "Rs. 620", "Rs. 640"], answer: "Rs. 600" },
    { question: "What is 11% of 900?", options: ["89", "95", "99", "101"], answer: "99" },
    { question: "If 3x = 42, x is:", options: ["12", "13", "14", "15"], answer: "14" },
    { question: "A class has 18 boys and 12 girls. The ratio of boys to total students is:", options: ["3:5", "2:5", "3:4", "4:5"], answer: "3:5" },
    { question: "What is the cube of 4?", options: ["16", "32", "48", "64"], answer: "64" },
  ],
  reasoning: [
    { question: "Find the next number: 3, 6, 12, 24, ?", options: ["30", "36", "42", "48"], answer: "48" },
    { question: "Odd one out: Circle, Triangle, Square, Table", options: ["Circle", "Square", "Table", "Triangle"], answer: "Table" },
    { question: "If CAT is coded as DBU, how is DOG coded?", options: ["EPH", "EPG", "DOH", "FPH"], answer: "EPH" },
    { question: "Pointing to a girl, Ravi says, 'She is the daughter of my mother's only child.' The girl is Ravi's:", options: ["Sister", "Daughter", "Niece", "Cousin"], answer: "Daughter" },
    { question: "Find the missing term: A, C, F, J, ?", options: ["M", "N", "O", "P"], answer: "O" },
    { question: "If SOUTH is written as HTUOS, then TRAIN is written as:", options: ["NIART", "TNIAR", "NIATR", "TRIAN"], answer: "NIART" },
    { question: "Which pair is similar? Book : Read", options: ["Pen : Ink", "Fork : Eat", "Chair : Sit", "Shoes : Walk"], answer: "Chair : Sit" },
    { question: "Complete the pattern: 2, 5, 10, 17, 26, ?", options: ["35", "36", "37", "38"], answer: "37" },
    { question: "If all roses are flowers and some flowers fade quickly, then:", options: ["All roses fade quickly", "Some roses may fade quickly", "No roses fade quickly", "Only flowers fade quickly"], answer: "Some roses may fade quickly" },
    { question: "Which word does not belong? East, West, North, Clock", options: ["East", "North", "Clock", "West"], answer: "Clock" },
    { question: "Find the next letter group: AZ, BY, CX, ?", options: ["DW", "DV", "EW", "DX"], answer: "DW" },
    { question: "A man walks 5 m north, then 5 m east. In which direction is he from the starting point?", options: ["North-East", "South-East", "North-West", "East"], answer: "North-East" },
    { question: "Mirror image of 26 would look like:", options: ["62", "92", "A reversed 26", "Depends on mirror orientation"], answer: "A reversed 26" },
    { question: "Choose the analogy: Finger is to Hand as Toe is to:", options: ["Foot", "Leg", "Nail", "Ankle"], answer: "Foot" },
    { question: "Find the next number: 1, 4, 9, 16, ?", options: ["20", "24", "25", "36"], answer: "25" },
    { question: "Choose the odd pair out: Sun-Day, Moon-Night, Pen-Write, Fish-Sky", options: ["Sun-Day", "Moon-Night", "Pen-Write", "Fish-Sky"], answer: "Fish-Sky" },
    { question: "If Monday is coded as 1 and Tuesday as 2, what is Friday?", options: ["4", "5", "6", "7"], answer: "5" },
    { question: "What comes next: B, E, H, K, ?", options: ["L", "M", "N", "O"], answer: "N" },
    { question: "If 5 + 3 = 28 and 7 + 2 = 45 in a code, then 6 + 4 = ?", options: ["36", "40", "52", "60"], answer: "52" },
    { question: "Choose the correct order: Seed, Plant, Flower, Fruit", options: ["Seed-Plant-Flower-Fruit", "Plant-Seed-Flower-Fruit", "Flower-Seed-Plant-Fruit", "Fruit-Flower-Seed-Plant"], answer: "Seed-Plant-Flower-Fruit" },
    { question: "In a row, Maya is 7th from the left and 10th from the right. How many people are in the row?", options: ["15", "16", "17", "18"], answer: "16" },
    { question: "Choose the missing term: 4, 9, 19, 39, ?", options: ["69", "79", "89", "99"], answer: "79" },
    { question: "If RED is coded as 27, and BLUE as 40, which word could be coded as 30?", options: ["GREEN", "PINK", "BLACK", "WHITE"], answer: "PINK" },
    { question: "Find the next shape count: 1 triangle, 2 squares, 3 pentagons, ?", options: ["4 hexagons", "4 circles", "5 hexagons", "4 rectangles"], answer: "4 hexagons" },
    { question: "A clock shows 3:15. What is the angle between the hands?", options: ["0 degrees", "7.5 degrees", "15 degrees", "22.5 degrees"], answer: "7.5 degrees" },
    { question: "If all cups are plates and some plates are bowls, then:", options: ["All bowls are cups", "Some bowls may be cups", "No cups are bowls", "All plates are cups"], answer: "Some bowls may be cups" },
    { question: "Choose the next term: Z, X, U, Q, ?", options: ["N", "M", "L", "K"], answer: "L" },
    { question: "If in a certain language, RAIN is written as SZJM, how is CLOUD written?", options: ["DMPTVE", "DMQVE", "DMPTWE", "DMQVEF"], answer: "DMQVE" },
    { question: "Which figure completes the series? Circle, triangle, circle, triangle, ?", options: ["Square", "Circle", "Triangle", "Star"], answer: "Circle" },
    { question: "Find the next number: 81, 27, 9, 3, ?", options: ["1", "0", "2", "6"], answer: "1" },
  ],
  verbal: [
    { question: "Choose the synonym of 'Rapid'.", options: ["Slow", "Quick", "Calm", "Late"], answer: "Quick" },
    { question: "Choose the antonym of 'Expand'.", options: ["Stretch", "Increase", "Shrink", "Lengthen"], answer: "Shrink" },
    { question: "Fill in the blank: She ____ to the office every day.", options: ["go", "goes", "gone", "going"], answer: "goes" },
    { question: "Which sentence is grammatically correct?", options: ["He don't like tea.", "He doesn't likes tea.", "He doesn't like tea.", "He not like tea."], answer: "He doesn't like tea." },
    { question: "Choose the correctly spelled word.", options: ["Accomodate", "Acommodate", "Accommodate", "Acomodate"], answer: "Accommodate" },
    { question: "Select the word closest in meaning to 'Brief'.", options: ["Short", "Bright", "Broad", "Empty"], answer: "Short" },
    { question: "Fill in the blank: We have lived here ____ 2019.", options: ["for", "since", "from", "at"], answer: "since" },
    { question: "Choose the antonym of 'Ancient'.", options: ["Old", "Historic", "Modern", "Traditional"], answer: "Modern" },
    { question: "Which word best completes the sentence? The lecture was so ____ that everyone stayed attentive.", options: ["boring", "engaging", "silent", "weak"], answer: "engaging" },
    { question: "Choose the correct article: She bought ____ umbrella.", options: ["a", "an", "the", "no article"], answer: "an" },
    { question: "Pick the synonym of 'Accurate'.", options: ["Exact", "Random", "Weak", "Harsh"], answer: "Exact" },
    { question: "Which sentence uses punctuation correctly?", options: ["After lunch we, went home.", "After lunch, we went home.", "After lunch we went, home.", "After, lunch we went home."], answer: "After lunch, we went home." },
    { question: "Choose the best meaning of 'Reluctant'.", options: ["Willing", "Uncertain", "Unwilling", "Excited"], answer: "Unwilling" },
    { question: "Fill in the blank: If I ____ more time, I would learn Spanish.", options: ["have", "had", "has", "having"], answer: "had" },
    { question: "Choose the odd word out.", options: ["Novel", "Poem", "Essay", "Hammer"], answer: "Hammer" },
    { question: "Choose the antonym of 'Visible'.", options: ["Bright", "Hidden", "Clear", "Sharp"], answer: "Hidden" },
    { question: "Which word is closest in meaning to 'Generous'?", options: ["Kind", "Selfish", "Loud", "Weak"], answer: "Kind" },
    { question: "Fill in the blank: Neither the teacher nor the students ____ late.", options: ["was", "were", "is", "be"], answer: "were" },
    { question: "Choose the correct sentence.", options: ["Everyone have a notebook.", "Everyone has a notebook.", "Everyone having a notebook.", "Everyone are having a notebook."], answer: "Everyone has a notebook." },
    { question: "Select the synonym of 'Cautious'.", options: ["Careful", "Careless", "Fast", "Sleepy"], answer: "Careful" },
    { question: "Pick the correct passive form: They built the bridge.", options: ["The bridge was built by them.", "The bridge built by them.", "The bridge is build by them.", "The bridge was builded by them."], answer: "The bridge was built by them." },
    { question: "Choose the antonym of 'Scarce'.", options: ["Rare", "Plenty", "Dry", "Weak"], answer: "Plenty" },
    { question: "Complete the sentence: The movie was ____ than I expected.", options: ["more interesting", "most interesting", "interesting", "interest"], answer: "more interesting" },
    { question: "Which word is correctly used?", options: ["He gave me an advice.", "He gave me some advice.", "He gave me many advice.", "He gave me advices."], answer: "He gave me some advice." },
    { question: "Choose the synonym of 'Bold'.", options: ["Timid", "Brave", "Shy", "Quiet"], answer: "Brave" },
    { question: "Pick the correct conjunction: I stayed home ____ it was raining.", options: ["because", "unless", "although", "until"], answer: "because" },
    { question: "Choose the word that does not belong: Verb, Noun, Adjective, Compass", options: ["Verb", "Noun", "Adjective", "Compass"], answer: "Compass" },
    { question: "Fill in the blank: By next month, she ____ here for five years.", options: ["will work", "will have worked", "works", "worked"], answer: "will have worked" },
    { question: "Choose the correct reported speech: He said, 'I am tired.'", options: ["He said he is tired.", "He said that he was tired.", "He told he was tired.", "He said that I am tired."], answer: "He said that he was tired." },
    { question: "Which sentence is in the correct comparative form?", options: ["This road is more safer.", "This road is safer.", "This road is safest.", "This road is safety."], answer: "This road is safer." },
  ],
};

const CODING_CHALLENGES = {
  coding_easy: {
    question: "Easy DSA: Two Sum Indices",
    prompt: "Given an array of integers and a target value, return the indices of the two numbers whose sum equals the target. You may assume exactly one valid pair exists and you cannot use the same element twice.",
    examples: ["nums = [2, 7, 11, 15], target = 9 -> output: [0, 1]", "nums = [3, 2, 4], target = 6 -> output: [1, 2]"],
    answer: "Reference approach: iterate once while storing visited numbers in a hash map. For each value x, check if target - x is already in the map. If yes, return the stored index and current index. Time complexity O(n), space complexity O(n).",
    timerSeconds: 10 * 60,
  },
  coding_advanced: {
    question: "Advanced DSA: Longest Substring Without Repeating Characters",
    prompt: "Given a string s, find the length of the longest substring without repeating characters. Explain your approach and write code or pseudocode for an optimal solution.",
    examples: ["s = 'abcabcbb' -> output: 3 because 'abc' is the longest unique substring", "s = 'pwwkew' -> output: 3 because 'wke' is the longest unique substring"],
    answer: "Reference approach: use a sliding window with two pointers and a map of last seen positions. Expand the right pointer, and when a repeated character appears inside the current window, move the left pointer just after the last seen position. Track the maximum window size. Time complexity O(n), space complexity O(min(n, charset)).",
    timerSeconds: 15 * 60,
  },
};
function getSectionConfig(sectionId) {
  return SECTION_OPTIONS.find((section) => section.id === sectionId) || SECTION_OPTIONS[0];
}

function isCodingSection(sectionId) {
  return getSectionConfig(sectionId).mode === "coding";
}

function getConfiguredQuestionCount(sectionId, selectedCount) {
  return isCodingSection(sectionId) ? 1 : selectedCount;
}

function getConfiguredDuration(sectionId, selectedCount) {
  if (isCodingSection(sectionId)) {
    return CODING_CHALLENGES[sectionId].timerSeconds;
  }
  return getConfiguredQuestionCount(sectionId, selectedCount) * 60;
}

function shuffleArray(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function buildSessionQuestions(sectionId, count) {
  if (isCodingSection(sectionId)) {
    const challenge = CODING_CHALLENGES[sectionId];
    return [{ sessionId: `${sectionId}-challenge-1`, type: "coding", question: challenge.question, prompt: challenge.prompt, examples: challenge.examples, answer: challenge.answer }];
  }

  const bank = QUESTION_BANKS[sectionId] || [];
  return shuffleArray(bank)
    .slice(0, count)
    .map((question, index) => ({ ...question, type: "mcq", sessionId: `${sectionId}-${index}` }));
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createSummary(sectionId, questions, answers, reason = "manual") {
  const codingMode = isCodingSection(sectionId);
  const answeredCount = answers.filter((answer) => (answer || "").trim().length > 0).length;
  const score = codingMode ? answeredCount : questions.filter((question, index) => answers[index] === question.answer).length;

  return {
    sectionId,
    mode: codingMode ? "coding" : "mcq",
    totalQuestions: questions.length,
    answeredCount,
    score,
    autoSubmitted: reason === "auto",
    items: questions.map((question, index) => ({
      ...question,
      selectedAnswer: answers[index] || "Not answered",
      correctAnswer: question.answer,
      isCorrect: codingMode ? null : answers[index] === question.answer,
    })),
  };
}

function AptitudeTest() {
  const [stage, setStage] = useState("landing");
  const [selectedSection, setSelectedSection] = useState("aptitude");
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [summary, setSummary] = useState(null);

  const selectedSectionConfig = useMemo(() => getSectionConfig(selectedSection), [selectedSection]);
  const configuredQuestionCount = getConfiguredQuestionCount(selectedSection, questionCount);
  const configuredDuration = getConfiguredDuration(selectedSection, questionCount);
  const totalMinutes = Math.floor(configuredDuration / 60);
  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.filter((answer) => (answer || "").trim().length > 0).length;

  function handleFinish(reason = "manual") {
    setStage("summary");
    setSummary(createSummary(selectedSection, questions, answers, reason));
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (stage !== "test") {
      return undefined;
    }

    if (timeLeft <= 0) {
      setStage("summary");
      setSummary(createSummary(selectedSection, questions, answers, "auto"));
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((currentTime) => currentTime - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [answers, questions, selectedSection, stage, timeLeft]);

  function handleOpenSetup() {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSummary(null);
    setTimeLeft(0);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function handleStartTest() {
    const sessionQuestions = buildSessionQuestions(selectedSection, configuredQuestionCount);
    setQuestions(sessionQuestions);
    setAnswers(new Array(sessionQuestions.length).fill(""));
    setCurrentIndex(0);
    setTimeLeft(configuredDuration);
    setSummary(null);
    setStage("test");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function handleSelectAnswer(value) {
    setAnswers((currentAnswers) => {
      const nextAnswers = [...currentAnswers];
      nextAnswers[currentIndex] = value;
      return nextAnswers;
    });
  }

  return (
    <div className="mock-page reveal">
      <MiniNavbar />

      <div className="mock-hero aptitude-hero" style={{ background: "linear-gradient(90deg, #0f766e 0%, #14b8a6 55%, #67e8f9 100%)" }}>
        <div>
          <h1>Aptitude Test</h1>
          <p>Choose a section, decide how many questions you want to practice, and take a timed round with instant summary review.</p>
          <button className="mock-btn" onClick={handleOpenSetup}>Start Aptitude Test -&gt;</button>
        </div>
      </div>

      {stage === "landing" && (
        <>
          <div className="mock-section">
            <div className="section-header-row">
              <h2 className="section-title">Practice Modes</h2>
              <button className="small-start-btn" onClick={handleOpenSetup}>Start Aptitude -&gt;</button>
            </div>

            <div className="aptitude-info-grid">
              <div className="aptitude-info-card aptitude-info-card-learn">
                <div className="aptitude-info-card-tag aptitude-info-card-tag-warm">What you'll learn</div>
                <ul>
                  <li>Quantitative, reasoning, and verbal problem solving with fully unique MCQ practice up to 30 questions per section</li>
                  <li>Section-based timed rounds so you can practice exactly the topic you want to improve</li>
                  <li>Easy and advanced coding challenges with DSA-style prompts and a final reference solution review</li>
                </ul>
              </div>

              <div className="aptitude-info-card aptitude-info-card-types">
                <div className="aptitude-info-card-tag aptitude-info-card-tag-strong">Question types</div>
                <ul>
                  <li>Aptitude, reasoning, and verbal sections use 4-option MCQs with 60 seconds per question</li>
                  <li>Easy Coding gives 1 DSA question with a 10 minute timer</li>
                  <li>Advanced Coding gives 1 DSA question with a 15 minute timer and a harder problem statement</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mistake-box">
            <div>
              <h2>Common Mistakes</h2>
              <ul>
                <li>Rushing through the question without reading all options or the full coding prompt</li>
                <li>Ignoring total time and spending too long on a single problem</li>
                <li>Leaving your thought process blank instead of writing the best answer you can before time ends</li>
              </ul>
            </div>
          </div>
        </>
      )}
      {stage === "setup" && (
        <div className="mock-section">
          <div className="aptitude-flow-card">
            <div className="aptitude-flow-header">
              <div>
                <span className="aptitude-chip">Test setup</span>
                <h2>Select your section and question count</h2>
                <p>Non-coding sections allow 10 to 30 unique questions. Coding sections are fixed to one DSA question with their own timer.</p>
              </div>
              <div className="aptitude-timer-preview">
                <span>Total time</span>
                <strong>{totalMinutes} min</strong>
                <small>{selectedSectionConfig.mode === "coding" ? "1 coding challenge" : `${configuredQuestionCount} questions x 60 sec`}</small>
              </div>
            </div>

            <div className="aptitude-setup-grid">
              {SECTION_OPTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`aptitude-section-card ${selectedSection === section.id ? "is-active" : ""}`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                </button>
              ))}
            </div>

            {selectedSectionConfig.mode === "coding" ? (
              <div className="aptitude-count-card aptitude-count-card-fixed">
                <div className="aptitude-count-copy">
                  <span className="aptitude-chip">Question count</span>
                  <h3>1 coding question</h3>
                  <p>{selectedSection === "coding_easy" ? "Easy Coding is fixed to one DSA question with 10 minutes." : "Advanced Coding is fixed to one DSA question with 15 minutes."}</p>
                </div>
                <div className="aptitude-count-fixed-pill">Fixed challenge</div>
              </div>
            ) : (
              <div className="aptitude-count-card">
                <div className="aptitude-count-copy">
                  <span className="aptitude-chip">Question count</span>
                  <h3>{questionCount} questions selected</h3>
                  <p>Minimum 10 questions and maximum 30 questions in one round.</p>
                </div>

                <div className="aptitude-count-controls">
                  <input
                    type="range"
                    min="10"
                    max="30"
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                  />
                  <div className="aptitude-count-stepper">
                    <button type="button" onClick={() => setQuestionCount((current) => Math.max(10, current - 1))}>-</button>
                    <div>{questionCount}</div>
                    <button type="button" onClick={() => setQuestionCount((current) => Math.min(30, current + 1))}>+</button>
                  </div>
                </div>
              </div>
            )}

            <div className="aptitude-flow-actions">
              <button type="button" className="small-start-btn aptitude-secondary-btn" onClick={() => setStage("landing")}>Back</button>
              <button type="button" className="mock-btn aptitude-primary-btn" onClick={handleStartTest}>Start Timed Test</button>
            </div>
          </div>
        </div>
      )}

      {stage === "test" && currentQuestion && (
        <div className="mock-section">
          <div className="aptitude-test-shell">
            <div className="aptitude-test-topbar">
              <div>
                <span className="aptitude-chip">Live test</span>
                <h2>{selectedSectionConfig.title}</h2>
              </div>
              <div className="aptitude-timer-live">
                <span>Time left</span>
                <strong>{formatTime(timeLeft)}</strong>
                <small>{answeredCount}/{questions.length} answered</small>
              </div>
            </div>

            <div className="aptitude-progress-row">
              <div className="aptitude-progress-text">Question {currentIndex + 1} of {questions.length}</div>
              <div className="aptitude-progress-bar">
                <span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            <div className="aptitude-question-card">
              <div className="aptitude-question-meta">
                {selectedSectionConfig.mode === "coding" ? (
                  <>
                    <span>{selectedSectionConfig.timerMinutes} minute DSA challenge</span>
                    <span>Write code, pseudocode, or your approach before time ends</span>
                  </>
                ) : (
                  <>
                    <span>60 sec per question</span>
                    <span>Total timer is running continuously</span>
                  </>
                )}
              </div>
              <h3>{currentQuestion.question}</h3>

              {selectedSectionConfig.mode === "coding" ? (
                <div className="aptitude-code-card">
                  <p className="aptitude-code-prompt">{currentQuestion.prompt}</p>
                  <div className="aptitude-code-examples">
                    {currentQuestion.examples.map((example) => (
                      <div key={example} className="aptitude-code-example">{example}</div>
                    ))}
                  </div>
                  <label className="aptitude-code-answer" htmlFor="coding-response">
                    <span>Your solution / approach</span>
                    <textarea id="coding-response" value={answers[currentIndex] || ""} onChange={(event) => handleSelectAnswer(event.target.value)} placeholder="Write your approach, pseudocode, or code here..." />
                  </label>
                </div>
              ) : (
                <div className="aptitude-options-grid">
                  {currentQuestion.options.map((option) => (
                    <button key={option} type="button" className={`aptitude-option ${answers[currentIndex] === option ? "is-selected" : ""}`} onClick={() => handleSelectAnswer(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSectionConfig.mode !== "coding" && (
              <>
                <div className="aptitude-question-map">
                  {questions.map((question, index) => (
                    <button key={question.sessionId} type="button" className={`aptitude-map-dot ${index === currentIndex ? "is-current" : ""} ${answers[index] ? "is-answered" : ""}`} onClick={() => setCurrentIndex(index)}>
                      {index + 1}
                    </button>
                  ))}
                </div>

                <div className="aptitude-flow-actions">
                  <button type="button" className="small-start-btn aptitude-secondary-btn" onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))} disabled={currentIndex === 0}>Previous</button>
                  <div className="aptitude-inline-actions">
                    <button type="button" className="small-start-btn aptitude-secondary-btn" onClick={() => handleFinish("manual")}>Submit Now</button>
                    <button type="button" className="mock-btn aptitude-primary-btn" onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))} disabled={currentIndex === questions.length - 1}>Next Question</button>
                  </div>
                </div>
              </>
            )}

            {selectedSectionConfig.mode === "coding" && (
              <div className="aptitude-flow-actions aptitude-coding-actions">
                <button type="button" className="small-start-btn aptitude-secondary-btn" onClick={handleOpenSetup}>Change Section</button>
                <button type="button" className="mock-btn aptitude-primary-btn" onClick={() => handleFinish("manual")}>Submit Solution</button>
              </div>
            )}
          </div>
        </div>
      )}
      {stage === "summary" && summary && (
        <div className="mock-section">
          <div className="aptitude-flow-card aptitude-summary-shell">
            <div className="aptitude-summary-hero">
              <div>
                <span className="aptitude-chip">Summary</span>
                <h2>{summary.autoSubmitted ? "Time is over. Your test was auto-submitted." : "Your test summary is ready."}</h2>
                <p>{summary.mode === "coding" ? "Below is your submitted solution and the reference approach for the coding challenge." : "Below is the answer review with your chosen option and the correct answer for every question."}</p>
              </div>
              <div className="aptitude-summary-score">
                <span>{summary.mode === "coding" ? "Attempted" : "Score"}</span>
                <strong>{summary.score}/{summary.totalQuestions}</strong>
                <small>{summary.answeredCount} answered</small>
              </div>
            </div>

            <div className="aptitude-summary-grid">
              <div className="aptitude-summary-stat">
                <span>Section</span>
                <strong>{getSectionConfig(summary.sectionId).title}</strong>
              </div>
              <div className="aptitude-summary-stat">
                <span>Total questions</span>
                <strong>{summary.totalQuestions}</strong>
              </div>
              <div className="aptitude-summary-stat">
                <span>{summary.mode === "coding" ? "Submitted" : "Correct answers"}</span>
                <strong>{summary.score}</strong>
              </div>
              <div className="aptitude-summary-stat">
                <span>Not answered</span>
                <strong>{summary.totalQuestions - summary.answeredCount}</strong>
              </div>
            </div>

            <div className="aptitude-review-list">
              {summary.items.map((item, index) => (
                <article key={item.sessionId} className={`aptitude-review-card ${summary.mode === "coding" ? "is-coding" : item.isCorrect ? "is-correct" : "is-incorrect"}`}>
                  <div className="aptitude-review-top">
                    <span>Question {index + 1}</span>
                    <strong>{summary.mode === "coding" ? "Reference review" : item.isCorrect ? "Correct" : "Review needed"}</strong>
                  </div>
                  <h3>{item.question}</h3>
                  {item.prompt && <p className="aptitude-review-prompt">{item.prompt}</p>}
                  <div className="aptitude-review-answer-grid">
                    <div>
                      <span>{summary.mode === "coding" ? "Your response" : "Your answer"}</span>
                      <p>{item.selectedAnswer}</p>
                    </div>
                    <div>
                      <span>{summary.mode === "coding" ? "Reference solution" : "Correct answer"}</span>
                      <p>{item.correctAnswer}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="aptitude-flow-actions">
              <button type="button" className="small-start-btn aptitude-secondary-btn" onClick={handleOpenSetup}>Practice Again</button>
              <button type="button" className="mock-btn aptitude-primary-btn" onClick={() => setStage("landing")}>Back to Overview</button>
            </div>
          </div>
        </div>
      )}

      <div className="bottom-footer">Prepared by AI Powered Interview System</div>
    </div>
  );
}

export default AptitudeTest;
