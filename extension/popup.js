const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

document.addEventListener('DOMContentLoaded', async () => {
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('back-btn');
    const syncBtn = document.getElementById('sync-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiInput = document.getElementById('api-key-input');
    const cvInput = document.getElementById('cv-text-input');
    
    // Load saved data
    const data = await chrome.storage.local.get(['gemini_api_key', 'cv_text']);
    if (data.gemini_api_key) apiInput.value = data.gemini_api_key;
    if (data.cv_text) {
        cvInput.value = data.cv_text;
        document.getElementById('sync-container').style.display = 'none';
        document.getElementById('analysis-container').style.display = 'block';
    }

    // Navigation
    settingsBtn.addEventListener('click', () => {
        mainView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    backBtn.addEventListener('click', () => {
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
    });

    // Save Settings
    saveSettingsBtn.addEventListener('click', async () => {
        const apiKey = apiInput.value.trim();
        const cvText = cvInput.value.trim();
        await chrome.storage.local.set({ gemini_api_key: apiKey, cv_text: cvText });
        alert('Settings saved!');
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
        
        if (cvText) {
            document.getElementById('sync-container').style.display = 'none';
            document.getElementById('analysis-container').style.display = 'block';
        }
    });

    // Sync from Web App
    syncBtn.addEventListener('click', async () => {
        // Query all tabs to find the LexiAI app
        const tabs = await chrome.tabs.query({});
        const lexiTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('vercel.app') || t.url.includes('lexiai')));
        
        if (!lexiTab) {
            alert('Không tìm thấy tab LexiAI đang mở. Vui lòng mở trang web LexiAI của bạn trước khi Sync.');
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: lexiTab.id },
            func: () => {
                const username = localStorage.getItem('username') || 'guest';
                return {
                    apiKey: localStorage.getItem('gemini_api_key'),
                    cvText: localStorage.getItem(`last_cv_text_${username}`)
                };
            }
        }, async (results) => {
            if (results && results[0] && results[0].result) {
                const { apiKey, cvText } = results[0].result;
                
                if (!apiKey || !cvText) {
                    alert('Tìm thấy tab LexiAI nhưng chưa có dữ liệu API Key hoặc CV. Vui lòng đăng nhập và tải CV lên web trước.');
                    return;
                }

                apiInput.value = apiKey;
                cvInput.value = cvText;
                await chrome.storage.local.set({ gemini_api_key: apiKey, cv_text: cvText });
                alert('Đồng bộ dữ liệu thành công!');
                
                document.getElementById('sync-container').style.display = 'none';
                document.getElementById('analysis-container').style.display = 'block';
            } else {
                alert('Không thể lấy dữ liệu từ tab LexiAI. Hãy thử tải lại trang web LexiAI và thử lại.');
            }
        });
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'analyzeJD') {
            performAnalysis(message.text);
        }
    });
});

async function performAnalysis(jdText) {
    const loading = document.getElementById('loading');
    const analysisContainer = document.getElementById('analysis-container');
    const syncContainer = document.getElementById('sync-container');
    
    loading.style.display = 'block';
    analysisContainer.style.display = 'none';
    syncContainer.style.display = 'none';

    try {
        const data = await chrome.storage.local.get(['gemini_api_key', 'cv_text']);
        const apiKey = data.gemini_api_key;
        const cvText = data.cv_text;

        if (!apiKey || !cvText) {
            alert('Please set your API Key and CV in settings or Sync from Web App first.');
            loading.style.display = 'none';
            syncContainer.style.display = 'block';
            return;
        }

        const prompt = `
            Dựa trên CV và Job Description (JD) sau đây, hãy thực hiện:
            1. Tính điểm phần trăm phù hợp (Match Score) giữa CV và JD (0-100).
            2. Liệt kê tối đa 5 kỹ năng quan trọng nhất mà ứng viên còn thiếu so với JD này.
            
            Trả về kết quả định dạng JSON:
            {
                "score": 85,
                "missing_skills": ["Docker", "Kubernetes", "Redis"]
            }

            CV: ${cvText}
            JD: ${jdText}
        `;

        const response = await fetch(`${API_URL}gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            })
        });

        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;
        const analysis = JSON.parse(text);

        updateUI(analysis);
    } catch (error) {
        console.error("Analysis Error:", error);
        alert("Error analyzing JD. Check your API Key or connection.");
    } finally {
        loading.style.display = 'none';
    }
}

function updateUI(analysis) {
    const scoreText = document.getElementById('score-text');
    const scorePath = document.getElementById('score-path');
    const missingSkillsList = document.getElementById('missing-skills');
    const analysisContainer = document.getElementById('analysis-container');

    analysisContainer.style.display = 'block';
    
    // Update Score
    scoreText.textContent = `${analysis.score}%`;
    scorePath.setAttribute('stroke-dasharray', `${analysis.score}, 100`);

    // Update Skills
    missingSkillsList.innerHTML = '';
    analysis.missing_skills.forEach(skill => {
        const li = document.createElement('li');
        li.textContent = skill;
        missingSkillsList.appendChild(li);
    });
}
