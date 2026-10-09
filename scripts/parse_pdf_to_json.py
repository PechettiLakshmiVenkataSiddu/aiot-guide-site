import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data/extracted_pages.json', 'r', encoding='utf-8') as f:
    pages = json.load(f)

def get_page_text(p_num):
    for p in pages:
        if p['page'] == p_num:
            return p['text']
    return ""

def get_page_range_text(start, end):
    result = []
    for p in pages:
        if start <= p['page'] <= end:
            result.append(p['text'])
    return "\n\n".join(result)

# 1. 10 Hardware AIoT Projects (Pages 104 - 135)
hardware_projects_meta = [
    {"id": "hw-1", "num": 1, "title": "Smart Temperature Monitor with Auto Alert", "start": 104, "end": 106, "time": "3–4 hours", "difficulty": "Beginner"},
    {"id": "hw-2", "num": 2, "title": "MQTT Sensor Dashboard — Real-Time Web Display", "start": 107, "end": 109, "time": "5–6 hours", "difficulty": "Beginner-Intermediate"},
    {"id": "hw-3", "num": 3, "title": "Edge AI Image Classifier — Run AI on Raspberry Pi", "start": 110, "end": 113, "time": "6–8 hours", "difficulty": "Intermediate"},
    {"id": "hw-4", "num": 4, "title": "AI-Powered Anomaly Detector with Claude Analysis", "start": 114, "end": 117, "time": "6–8 hours", "difficulty": "Intermediate"},
    {"id": "hw-5", "num": 5, "title": "LangChain Conversational IoT Assistant", "start": 118, "end": 121, "time": "8–10 hours", "difficulty": "Intermediate-Advanced"},
    {"id": "hw-6", "num": 6, "title": "n8n Factory Alert Automation — No-Code Pipeline", "start": 122, "end": 123, "time": "4–5 hours", "difficulty": "Intermediate"},
    {"id": "hw-7", "num": 7, "title": "Raspberry Pi Predictive Maintenance System", "start": 124, "end": 126, "time": "2–3 weeks", "difficulty": "Advanced"},
    {"id": "hw-8", "num": 8, "title": "WhatsApp IoT Control Bot", "start": 127, "end": 129, "time": "5–6 hours", "difficulty": "Intermediate"},
    {"id": "hw-9", "num": 9, "title": "Full Stack AIoT Web Application — React + FastAPI + MongoDB", "start": 130, "end": 132, "time": "2–3 weeks", "difficulty": "Advanced"},
    {"id": "hw-10", "num": 10, "title": "Complete AI-Native Autonomous Monitoring System", "start": 133, "end": 135, "time": "4–6 weeks", "difficulty": "Expert"}
]

hardware_projects = []
for m in hardware_projects_meta:
    raw = get_page_range_text(m["start"], m["end"])
    
    # Extract sections using regex
    hw_match = re.search(r'Hardware Required(.*?)(?=Software & Libraries|$)', raw, re.DOTALL)
    hardware_req = [line.strip().lstrip('●- ') for line in hw_match.group(1).strip().split('\n') if line.strip() and not line.strip().startswith('Hardware Required')] if hw_match else []
    
    sw_match = re.search(r'Software & Libraries(.*?)(?=Wiring / Connections|$)', raw, re.DOTALL)
    software_req = [line.strip().lstrip('●- ') for line in sw_match.group(1).strip().split('\n') if line.strip() and not line.strip().startswith('Software & Libraries')] if sw_match else []
    
    wiring_match = re.search(r'Wiring / Connections(.*?)(?=Step-by-Step Build Guide|$)', raw, re.DOTALL)
    wiring = wiring_match.group(1).strip() if wiring_match else ""
    
    steps_match = re.search(r'Step-by-Step Build Guide(.*?)(?=Core Code|$)', raw, re.DOTALL)
    steps = []
    if steps_match:
        for s in steps_match.group(1).strip().split('\n'):
            s = s.strip()
            if s and ('Step ' in s or s.startswith('●')):
                steps.append(s.lstrip('●- '))
    
    learn_match = re.search(r'What You Learn From This Project(.*?)(?=Video References|$)', raw, re.DOTALL)
    learn_points = [line.strip().lstrip('●- ') for line in learn_match.group(1).strip().split('\n') if line.strip() and not line.strip().startswith('What You Learn')] if learn_match else []
    
    videos_match = re.search(r'Video References(.*?)(?=\n[A-Z0-9\s]{5,}|$)', raw, re.DOTALL)
    video_refs = []
    if videos_match:
        for line in videos_match.group(1).strip().split('\n'):
            line = line.strip().lstrip('▶🔗●- ')
            if 'youtube.com' in line or 'youtu.be' in line:
                video_refs.append(line)
    
    # Extract Code snippet
    code_match = re.search(r'Core Code(.*?)(?=What You Learn From This Project|$)', raw, re.DOTALL)
    code = code_match.group(1).strip() if code_match else ""
    
    # Extract short description
    desc_match = re.search(r'Difficulty:.*?\n\n(.*?)(?=\n\nHardware Required)', raw, re.DOTALL)
    desc = desc_match.group(1).strip() if desc_match else ""
    if not desc:
        desc = raw.split("Hardware Required")[0].split(m["title"])[-1].strip()

    hardware_projects.append({
        "id": m["id"],
        "number": m["num"],
        "title": m["title"],
        "time": m["time"],
        "difficulty": m["difficulty"],
        "description": desc,
        "hardware": hardware_req,
        "software": software_req,
        "wiring": wiring,
        "steps": steps,
        "code": code,
        "whatYouLearn": learn_points,
        "videoReferences": video_refs,
        "startPage": m["start"],
        "endPage": m["end"]
    })

# 2. 12 Sunday AI Projects (Pages 35 - 37)
sunday_raw = get_page_range_text(35, 37)
sunday_projects = []
month_pattern = r'Month (\d) Projects.*?(?=Month \d Projects|Chapter 12|$)'
# We can extract the 12 projects
proj_blocks = re.findall(r'Project (\d+) \((Week \d+)\): (.*?)\nDescription: (.*?)\nTools: (.*?)\n(?:GitHub repo name: (.*?)\n)?(.*?)(?=Project \d+|Month \d+ Projects|Chapter 12|$)', sunday_raw, re.DOTALL)

for b in proj_blocks:
    num, week, title, desc, tools, repo, rest = b
    bullets = [l.strip().lstrip('●- ') for l in rest.strip().split('\n') if l.strip() and not l.strip().startswith('Documentation:')]
    
    # Determine month
    p_num = int(num)
    month = 1 if p_num <= 4 else (2 if p_num <= 8 else (3 if p_num <= 10 else 4))
    
    sunday_projects.append({
        "id": f"sunday-{num}",
        "number": p_num,
        "week": week.strip(),
        "month": month,
        "title": title.strip(),
        "description": desc.strip(),
        "tools": [t.strip() for t in tools.split(',')],
        "repoName": repo.strip() if repo else f"aiot-project-{num}",
        "features": bullets
    })

# 3. 5 System Architectures (Pages 70 - 72)
arch_meta = [
    {"id": "arch-1", "num": 1, "title": "Smart Motor Health Monitor (NIAT Project Level)", "p": 70},
    {"id": "arch-2", "num": 2, "title": "Greenhouse AI Climate Controller", "p": 70},
    {"id": "arch-3", "num": 3, "title": "Factory Quality Inspection Vision System", "p": 71},
    {"id": "arch-4", "num": 4, "title": "Agricultural IoT + AI Irrigation System", "p": 71},
    {"id": "arch-5", "num": 5, "title": "Campus Security AI Camera Network (Capstone)", "p": 72}
]

architectures = []
for am in arch_meta:
    p_text = get_page_text(am["p"])
    if am["p"] == 70 and am["num"] == 1:
        segment = p_text.split("I.2 Architecture 2")[0]
    elif am["p"] == 70 and am["num"] == 2:
        segment = p_text.split("I.2 Architecture 2")[1] + "\n" + get_page_text(71).split("I.3 Architecture 3")[0]
    elif am["p"] == 71 and am["num"] == 3:
        segment = get_page_text(71).split("I.3 Architecture 3")[1].split("I.4 Architecture 4")[0]
    elif am["p"] == 71 and am["num"] == 4:
        segment = get_page_text(71).split("I.4 Architecture 4")[1] + "\n" + get_page_text(72).split("I.5 Architecture 5")[0]
    else:
        segment = get_page_text(72).split("I.5 Architecture 5")[1]

    prob = re.search(r'Problem:\s*(.*?)\n', segment)
    sol = re.search(r'Solution:\s*(.*?)\n', segment)
    data_flow = re.search(r'Data flow:\s*(.*?)(?=\n\n|\nModel training|\nKey metrics|$)', segment, re.DOTALL)
    
    architectures.append({
        "id": am["id"],
        "number": am["num"],
        "title": am["title"],
        "problem": prob.group(1).strip() if prob else "Industrial challenge",
        "solution": sol.group(1).strip() if sol else "Edge AI automation solution",
        "dataFlow": data_flow.group(1).strip() if data_flow else "",
        "rawContent": segment.strip(),
        "page": am["p"]
    })

# 4. Glossary (Pages 38 - 39)
glossary = [
    {"term": "AIoT", "definition": "Artificial Intelligence of Things — integration of AI/ML with IoT devices for real-time local intelligence."},
    {"term": "Edge AI", "definition": "Running ML inference directly on embedded hardware (Raspberry Pi, ESP32, Jetson) without relying on the cloud."},
    {"term": "TFLite", "definition": "TensorFlow Lite — compressed, optimized ML runtime specifically engineered for ARM processors and embedded microcontrollers."},
    {"term": "ONNX", "definition": "Open Neural Network Exchange — hardware-agnostic open format for AI models, allowing easy conversion across frameworks (PyTorch -> ONNX -> TFLite)."},
    {"term": "Quantisation", "definition": "Technique reducing model weight precision (FP32 -> INT8) for 4x smaller binary footprint and 2-3x faster inference speed."},
    {"term": "MQTT", "definition": "Message Queuing Telemetry Transport — lightweight publish/subscribe network protocol designed for low-bandwidth, high-latency IoT devices."},
    {"term": "OPC-UA", "definition": "Open Platform Communications Unified Architecture — standard industrial machine-to-machine communication protocol in Japanese smart factories."},
    {"term": "ROS2", "definition": "Robot Operating System 2 — open-source robotics middleware providing nodes, topics, and services for autonomous systems."},
    {"term": "SLAM", "definition": "Simultaneous Localisation and Mapping — foundational algorithm computing real-time position while mapping unknown environments."},
    {"term": "LiDAR", "definition": "Light Detection and Ranging — optical remote sensing technology capturing high-resolution 3D point cloud distance data."},
    {"term": "Vibe Coding", "definition": "Building software by articulating system specifications in natural language and directing AI code generation engines iteratively."},
    {"term": "LLM", "definition": "Large Language Model — deep neural network trained on vast text corpora (Claude, GPT, Gemini) capable of complex reasoning."},
    {"term": "RAG", "definition": "Retrieval-Augmented Generation — system architecture combining vector search retrieval with LLM generation for grounded, hallucination-free answers."},
    {"term": "Vector DB", "definition": "High-performance database optimized for cosine similarity indexing across high-dimensional dense embeddings (Chroma, Pinecone)."},
    {"term": "LangChain", "definition": "Python and TypeScript framework providing abstractions for LLM tool calling, memory buffers, and multi-step autonomous agents."},
    {"term": "n8n", "definition": "Extendable, open-source workflow automation platform running on Node.js with native support for MQTT, HTTP webhooks, and AI reasoning nodes."},
    {"term": "MCP", "definition": "Model Context Protocol — open standard designed by Anthropic for exposing tools, prompts, and database resources to AI models."},
    {"term": "Cursor", "definition": "AI-first code editor built on VS Code with codebase indexing, multi-file edits, and inline agent capabilities."},
    {"term": "Inference", "definition": "The forward execution phase where a trained machine learning model evaluates live sensor inputs to generate predictions."},
    {"term": "Latency", "definition": "Elapsed duration from physical sensor signal arrival to processed output; mission-critical metric for industrial edge safety."},
    {"term": "GPIO", "definition": "General Purpose Input/Output — digital pins on microcontrollers and single-board computers for reading sensors and pulsing actuators."},
    {"term": "I2C", "definition": "Inter-Integrated Circuit — two-wire (SDA/SCL) synchronous serial communication bus enabling multiple peripheral sensors per bus."},
    {"term": "SPI", "definition": "Serial Peripheral Interface — four-wire (MISO/MOSI/SCK/CS) high-speed serial bus ideal for high-throughput sensors and displays."},
    {"term": "Kaizen (改善)", "definition": "Core Japanese philosophy of continuous, incremental workflow improvements adopted across all top manufacturing facilities."},
    {"term": "Horenso (報連相)", "definition": "Essential Japanese workplace communication framework: Houkoku (Report), Renraku (Contact), and Soudan (Consult)."},
    {"term": "Nemawashi (根回し)", "definition": "Japanese corporate consensus-building practice: consulting all stakeholders informally prior to official meetings."},
    {"term": "JLPT", "definition": "Japanese-Language Proficiency Test — standardized evaluation scale ranging from N5 (beginner) to N1 (fluent native level)."}
]

# Technical English Writing Guide
english_guide = {
    "commonMistakes": [
        {
            "category": "Missing Articles (a, an, the)",
            "rule": "Use 'a' before consonant sounds, 'an' before vowels, and 'the' for specific shared references.",
            "wrong": "I built sensor system for factory.",
            "correct": "I built a sensor system for a factory."
        },
        {
            "category": "Wrong Verb Tense",
            "rule": "Use Present Simple for system capabilities (it runs), Past Simple for completed actions (I built), Present Perfect for achievements.",
            "wrong": "I am built a classifier that is detecting anomalies.",
            "correct": "I built a classifier that detects anomalies."
        },
        {
            "category": "Stative Verbs with -ing",
            "rule": "'Know', 'understand', 'have', 'be' are stative verbs. Never say 'I am knowing'.",
            "wrong": "I am knowing Python since 2 years.",
            "correct": "I have been learning Python for 2 years."
        },
        {
            "category": "Subject-Verb Agreement",
            "rule": "Data is treated as singular/uncountable in technical writing. 'Each of the models is...', 'The team has decided...'",
            "wrong": "The sensor data are showing high values.",
            "correct": "The sensor data is showing high values."
        },
        {
            "category": "Direct Translation / Indianisms",
            "rule": "Avoid literal translations like 'only', 'good name', 'do the needful', or 'revert back'.",
            "wrong": "Please do the needful and revert back to me.",
            "correct": "Please review the attached code and let me know your thoughts."
        },
        {
            "category": "Preposition Collocations",
            "rule": "good AT (skills), experience IN (fields), experience WITH (tools), interested IN (topics), work ON (projects).",
            "wrong": "I am good in Python and have experience on Raspberry Pi.",
            "correct": "I am good at Python and have experience with Raspberry Pi."
        }
    ],
    "actionVerbs": [
        {"past": "Built", "present": "Runs", "example": "Built a TFLite inference pipeline achieving 18ms latency on Pi 4."},
        {"past": "Implemented", "present": "Supports", "example": "Implemented MQTT pub/sub with QoS 1 auto-reconnect logic."},
        {"past": "Reduced", "present": "Achieves", "example": "Reduced inference latency by 40% using INT8 quantization."},
        {"past": "Engineered", "present": "Automates", "example": "Engineered an autonomous n8n alert pipeline dispatching multi-channel notifications."}
    ]
}

# 5. DSA Patterns (Pages 42 - 44)
dsa_raw = get_page_range_text(42, 44)
dsa_patterns = [
    {
        "id": "sliding-window",
        "title": "Sliding Window Pattern",
        "useWhen": "Finding max/min/sum of a subarray of fixed or variable size. Problems: Maximum sum subarray of size K, Longest substring without repeating characters, Minimum window substring.",
        "complexity": "Time: O(n), Space: O(k)",
        "code": """// Fixed window
int left = 0, windowSum = 0, maxSum = 0;
for (int right = 0; right < nums.size(); right++) {
    windowSum += nums[right];
    if (right - left + 1 == k) {
        maxSum = max(maxSum, windowSum);
        windowSum -= nums[left++];
    }
}"""
    },
    {
        "id": "two-pointer",
        "title": "Two Pointer Pattern",
        "useWhen": "Sorted array, finding pairs that sum to target, removing duplicates, palindrome check.",
        "complexity": "Time: O(n), Space: O(1)",
        "code": """int left = 0, right = nums.size() - 1;
while (left < right) {
    int sum = nums[left] + nums[right];
    if (sum == target) return {left, right};
    else if (sum < target) left++;
    else right--;
}"""
    },
    {
        "id": "binary-search",
        "title": "Binary Search Pattern",
        "useWhen": "Sorted array, search space can be halved, or binary search on answer.",
        "complexity": "Time: O(log n), Space: O(1)",
        "code": """int left = 0, right = nums.size() - 1;
while (left <= right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
}"""
    },
    {
        "id": "bfs",
        "title": "BFS Pattern — Level Order Traversal",
        "useWhen": "Shortest path in unweighted graph, level-by-level tree processing, minimum steps.",
        "complexity": "Time: O(V + E), Space: O(V)",
        "code": """vector<int> visited(n, 0);
queue<int> q;
q.push(start); visited[start] = 1;
while (!q.empty()) {
    int node = q.front(); q.pop();
    for (int neighbour : adj[node]) {
        if (!visited[neighbour]) {
            visited[neighbour] = 1;
            q.push(neighbour);
        }
    }
}"""
    },
    {
        "id": "dfs",
        "title": "DFS Pattern — Graph and Tree",
        "useWhen": "Cycle detection, topological sort, connected components, path finding.",
        "complexity": "Time: O(V + E), Space: O(V)",
        "code": """void dfs(int node, vector<vector<int>>& adj, vector<int>& vis) {
    vis[node] = 1;
    for (int neighbour : adj[node]) {
        if (!vis[neighbour]) dfs(neighbour, adj, vis);
    }
}"""
    },
    {
        "id": "dp",
        "title": "Dynamic Programming — 1D & 2D Templates",
        "useWhen": "Overlapping subproblems and optimal substructure (LCS, Knapsack, Edit Distance).",
        "complexity": "1D: O(n), 2D: O(m*n)",
        "code": """// 1D DP
vector<int> dp(n+1, 0);
dp[0] = base_0; dp[1] = base_1;
for (int i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];

// 2D DP
vector<vector<int>> dp(m+1, vector<int>(n+1, 0));
for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
        if (s1[i-1] == s2[j-1]) dp[i][j] = 1 + dp[i-1][j-1];
        else dp[i][j] = max(dp[i-1][j], dp[i][j-1]);
    }
}"""
    }
]

# 6. Monthly Milestones (Pages 40 - 41)
milestones = [
    {
        "month": 1,
        "title": "Month 1: Vibe Coding + Claude API Fundamentals",
        "items": [
            "Cursor IDE installed and used daily for weekday coding",
            "First Claude API call made successfully",
            "Sensor simulator project on GitHub with demo screenshot",
            "AI code reviewer project on GitHub",
            "50 Striver DSA problems solved and pushed to GitHub",
            "Hiragana and Katakana memorised (test: write without chart)"
        ]
    },
    {
        "month": 2,
        "title": "Month 2: n8n Automation + Linux Workflows",
        "items": [
            "n8n self-hosted on Raspberry Pi or VPS",
            "Sensor alert pipeline workflow built and tested",
            "5 n8n workflows documented with screenshots",
            "First internship applications sent (minimum 10)",
            "PyTorch CIFAR-10 model trained and saved",
            "JLPT N4 study begun — first 200 vocabulary words"
        ]
    },
    {
        "month": 3,
        "title": "Month 3: LangChain Agents + RAG + Hardware Prototype",
        "items": [
            "LangChain AIoT agent responding to natural language sensor queries",
            "RAG system loaded with technical documentation",
            "NIAT IoT project prototype working",
            "TFLite model running on Raspberry Pi with benchmark data",
            "LinkedIn post about AIoT project published — minimum 50 reactions",
            "Active internship interview or 20+ applications sent"
        ]
    },
    {
        "month": 4,
        "title": "Month 4: Full AIoT Predictive Maintenance & Portfolio",
        "items": [
            "Full predictive maintenance demo system running end-to-end",
            "GitHub portfolio: 8+ repos with READMEs and demo videos",
            "JLPT N4 mock test score: 65%+ (test-ready)",
            "Resume finalised: 1 page, 4 projects, all skills listed",
            "Internship secured OR 30+ applications sent with follow-ups",
            "Personal AI study assistant project completed"
        ]
    }
]

# 7. Chapters Index (All 12 from Volume 1 + Highlights from Volume 2)
chapters = [
    {
        "number": 1,
        "title": "AI and the Future of Engineering",
        "pages": "2–4",
        "summary": "Why AIoT engineers are protected from AI automation: physical hardware, embedded systems, and domain ML. The 3 essential AI skills for 2026: Prompt Engineering, Vibe Coding, and AI Agent building.",
        "keyPoints": [
            "AI replaces repetitive, non-physical tasks (generic CRUD, junior writing, simple QA).",
            "AIoT combines Physical Hardware, Embedded Software, and Domain ML — an irreplaceable triplet.",
            "The Japan AIoT market is facing massive labour shortages in manufacturing robotics, creating huge demand for Indian engineers with EEE + Edge AI + Japanese skills."
        ]
    },
    {
        "number": 2,
        "title": "Vibe Coding and Cursor IDE — Complete Guide",
        "pages": "5–8",
        "summary": "Mastering Cursor IDE: Inline edits (Ctrl+K), Chat (Ctrl+L), Composer (Ctrl+I), @ mentions, and configuring .cursorrules for edge AI development.",
        "keyPoints": [
            "Always configure .cursorrules with project hardware constraints (Raspberry Pi 4, TFLite, paho-mqtt).",
            "Follow PRD -> Module -> Test -> Integration vibe coding loop.",
            "Never accept AI code blindly — review logic and test with mocks."
        ]
    },
    {
        "number": 3,
        "title": "Claude API and Prompt Engineering",
        "pages": "9–13",
        "summary": "Programmatic reasoning using Anthropic's Claude models for sensor anomaly explanation, structured JSON outputs, chain of thought reasoning, and conversation memory buffers.",
        "keyPoints": [
            "System prompts transform Claude into an industrial diagnostic engineer.",
            "Enforce strict JSON schema with few-shot examples for automated pipelines.",
            "Implement sliding window conversation history to control token costs."
        ]
    },
    {
        "number": 4,
        "title": "n8n AI Automation for AIoT Workflows",
        "pages": "14–16",
        "summary": "Self-hosted visual automation on Raspberry Pi. Connecting MQTT broker triggers, Claude AI nodes, Gmail alerts, and MongoDB logging without web server boilerplate.",
        "keyPoints": [
            "Why n8n over Zapier/Make: free self-hosted, native MQTT node, full data privacy.",
            "Systemd service configuration for 24/7 reliability on Pi.",
            "Building WhatsApp query bots and automated daily reports."
        ]
    },
    {
        "number": 5,
        "title": "LangChain and AI Agents",
        "pages": "17–19",
        "summary": "Building autonomous agents that decide when to call sensor tools, query time-series databases, and perform RAG retrieval over machine maintenance logs.",
        "keyPoints": [
            "Agents use tool calling to inspect live hardware states.",
            "RAG architecture: Document chunking -> ChromaDB vector store -> Claude synthesis.",
            "Stateful agents remember past trend context without manual tracking."
        ]
    },
    {
        "number": 6,
        "title": "Edge AI and TensorFlow Lite — Complete Technical Guide",
        "pages": "20–23",
        "summary": "The Train -> Convert -> Deploy workflow. INT8 quantization reducing model size by 4x. Benchmarking latency, P95, and FPS on Raspberry Pi 4 ARM architecture.",
        "keyPoints": [
            "Japanese factories demand Edge AI for air-gapped security and sub-50ms latency.",
            "PyTorch -> ONNX -> TFLite conversion pipeline.",
            "Benchmarking mean latency, P95/P99 latency, and frame rate."
        ]
    },
    {
        "number": 7,
        "title": "Raspberry Pi and AIoT Full Stack Reference",
        "pages": "24–26",
        "summary": "Raspberry Pi 4 hardware setup, Pi Camera Module 3, GPIO sensor interfacing (DHT22, BME280, ADXL345), and the 4-layer production architecture.",
        "keyPoints": [
            "Hardware setup: Pi 4 4GB, Pi OS Lite 64-bit, official 5V 3A supply, aluminium heatsink case.",
            "Complete sensor integration pinouts for I2C, SPI, and 1-Wire.",
            "4-layer stack: Sensor Layer -> Edge Processing -> Data Layer (MongoDB) -> Presentation (Node-RED)."
        ]
    },
    {
        "number": 8,
        "title": "MQTT and IoT Protocols — Deep Dive",
        "pages": "27–29",
        "summary": "Production MQTT client with auto-reconnection, QoS levels, retain flags, Last Will and Testament (LWT), enterprise topic design, and Japanese industrial OPC-UA.",
        "keyPoints": [
            "QoS 0 for high-frequency telemetries; QoS 1 for alerts; QoS 2 for actuator commands.",
            "Topic schema: {org}/{facility}/{zone}/{device_id}/{data_type}.",
            "OPC-UA with asyncua for connecting to Japanese factory PLCs (Mitsubishi, Omron)."
        ]
    },
    {
        "number": 9,
        "title": "Autonomous Vehicles — Your Future Domain",
        "pages": "30–32",
        "summary": "Mapping AIoT skills to Autonomous Vehicles: perception, localisation, CARLA simulation, and ROS2 middleware.",
        "keyPoints": [
            "Computer vision + sensor fusion + edge computing transition directly to AV stacks.",
            "Simulating with CARLA in Python before obtaining vehicle hardware.",
            "ROS2 as the inter-process messaging backbone."
        ]
    },
    {
        "number": 10,
        "title": "Japan AIoT Industry — Career and Market Guide",
        "pages": "33–34",
        "summary": "Industrial AI companies in Japan (Panasonic, Omron, Keyence, Fanuc, Denso), visa requirements, salary progression, and cultural concepts: Nemawashi, Kaizen, and Horenso.",
        "keyPoints": [
            "Salary ranges from ¥300-380万 (entry) to ¥500-700万+ (senior) with 40-50% savings potential.",
            "Nemawashi (consensus building) and Horenso (report, contact, consult).",
            "Leveraging Indian EEE hardware grounding as a standout differentiator."
        ]
    },
    {
        "number": 11,
        "title": "12 Sunday AI Projects — 4 Months of Hands-On Learning",
        "pages": "35–37",
        "summary": "Week-by-week Sunday projects spanning Sensor Simulators, Resume Optimisers, Japanese Vocab Tutors, DSA AI Reviewers, n8n Pipelines, and Predictive Maintenance.",
        "keyPoints": [
            "4 hours per Sunday creating production-grade GitHub portfolio repositories.",
            "Progressive complexity stacking previous week's skills into next week's modules."
        ]
    },
    {
        "number": 12,
        "title": "Glossary, YouTube Index, and 4-Month Study Tracker",
        "pages": "38–41",
        "summary": "Comprehensive technical terms index, curated video playlists, documentation links, and accountability checklists.",
        "keyPoints": [
            "Structured reference dictionary for quick lookup.",
            "Accountability milestones across Month 1 to Month 4."
        ]
    }
]

# 8. Japanese Learning Data (Pages 48-50, 79-81, 152-157)
japanese_grammar = [
    {"pattern": "〜ている (te-iru)", "meaning": "Ongoing action or current state", "example": "センサーが動いています。", "translation": "The sensor is working."},
    {"pattern": "〜てから (te-kara)", "meaning": "After doing ~", "example": "コードをテストしてから、デプロイします。", "translation": "After testing the code, I will deploy it."},
    {"pattern": "〜たら (tara)", "meaning": "When/If (after completing ~)", "example": "エラーが出たら、ログを確認してください。", "translation": "If an error appears, please check the log."},
    {"pattern": "〜ば〜ほど (ba... hodo)", "meaning": "The more ~, the more ~", "example": "データが多ければ多いほど、モデルの精度が上がります。", "translation": "The more data there is, the higher the model accuracy."},
    {"pattern": "〜ことができる (koto ga dekiru)", "meaning": "Can do ~ / To be able to ~", "example": "ラズベリーパイで AI を実行することができます。", "translation": "We can run AI on Raspberry Pi."},
    {"pattern": "〜ようになる (yoo ni naru)", "meaning": "Come to be able to / Start to", "example": "毎日コードを書いて、早く書けるようになりました。", "translation": "By writing code every day, I became able to write it quickly."},
    {"pattern": "〜ために (tame ni)", "meaning": "In order to / For the purpose of", "example": "AIoT エンジニアになるために、毎日勉強しています。", "translation": "I study every day in order to become an AIoT engineer."},
    {"pattern": "〜ながら (nagara)", "meaning": "While doing ~ simultaneously", "example": "データを分析しながら、レポートを書きます。", "translation": "I write the report while analysing the data."},
    {"pattern": "〜てもいいですか (te mo ii desu ka)", "meaning": "May I ~?", "example": "このコードを変更してもいいですか？", "translation": "May I change this code?"},
    {"pattern": "〜てはいけない (te wa ikenai)", "meaning": "Must not / Not allowed to", "example": "API キーを GitHub にアップロードしてはいけません。", "translation": "You must not upload API keys to GitHub."},
    {"pattern": "〜なければならない (nakereba naranai)", "meaning": "Must / Have to", "example": "バグを修正しなければなりません。", "translation": "I must fix the bug."},
    {"pattern": "〜と思います (to omoimasu)", "meaning": "I think that ~", "example": "MQTT はこのプロジェクトに適していると思います。", "translation": "I think MQTT is suitable for this project."},
    {"pattern": "〜かもしれません (kamoshiremasen)", "meaning": "Might ~ / Perhaps ~", "example": "センサーが壊れているかもしれません。", "translation": "The sensor might be broken."},
    {"pattern": "〜はずです (hazu desu)", "meaning": "Should be ~ (expectation)", "example": "推論の速度は 50ms 以下のはずです。", "translation": "The inference speed should be under 50ms."},
    {"pattern": "〜そうです (soo desu)", "meaning": "Looks like ~ / Seems like ~", "example": "センサーが壊れそうです。", "translation": "The sensor looks like it is about to break."},
    {"pattern": "〜によって (ni yotte)", "meaning": "Depending on ~ / By ~", "example": "センサーの種類によって、設定が違います。", "translation": "The settings differ depending on the sensor type."},
    {"pattern": "〜について (ni tsuite)", "meaning": "About ~ / Regarding ~", "example": "MQTT プロトコルについて説明します。", "translation": "I will explain about the MQTT protocol."},
    {"pattern": "〜ていただけますか (te itadakemasu ka)", "meaning": "Could you please ~? (polite request)", "example": "コードをレビューしていただけますか？", "translation": "Could you please review the code?"},
    {"pattern": "〜だけでなく〜も (dakedenaku... mo)", "meaning": "Not only ~ but also ~", "example": "ハードウェアだけでなく AI ソフトウェアも理解しています。", "translation": "I understand not only hardware but also AI software."}
]

# Write out final structured JSON
final_data = {
    "title": "AIoT Engineer Complete Master Study Guide",
    "pagesCount": 163,
    "userProfile": {
        "degree": "B.Tech CS-IT + EEE Diploma",
        "institution": "Malla Reddy University, Hyderabad",
        "decadeRoadmap": "2025 — 2033",
        "targetCity": "Japan (Panasonic / Omron) → Vizag Indo-Japan Tech Startup (2033)"
    },
    "chapters": chapters,
    "sundayProjects": sunday_projects,
    "hardwareProjects": hardware_projects,
    "architectures": architectures,
    "glossary": glossary,
    "englishGuide": english_guide,
    "dsaPatterns": dsa_patterns,
    "milestones": milestones,
    "japaneseGrammar": japanese_grammar
}

with open("src/data/guideData.json", "w", encoding="utf-8") as f:
    json.dump(final_data, f, indent=2, ensure_ascii=False)

print(f"Successfully generated src/data/guideData.json with:")
print(f"- {len(chapters)} Chapters")
print(f"- {len(sunday_projects)} Sunday Projects")
print(f"- {len(hardware_projects)} Hardware Projects (with code, steps, wiring)")
print(f"- {len(architectures)} Architectures")
print(f"- {len(glossary)} Glossary entries")
print(f"- {len(dsa_patterns)} DSA Patterns")
print(f"- {len(milestones)} Monthly Milestones")
print(f"- {len(japanese_grammar)} Japanese Grammar Rules")
