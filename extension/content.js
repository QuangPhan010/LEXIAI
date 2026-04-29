let floatingButton = null;
let resultModal = null;

document.addEventListener('mouseup', (event) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 50 && !isInsideLexiUI(event.target)) {
        if (!floatingButton) {
            createFloatingButton();
        }
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        floatingButton.style.display = 'flex';
        floatingButton.style.top = `${window.scrollY + rect.bottom + 10}px`;
        floatingButton.style.left = `${window.scrollX + rect.left}px`;
        floatingButton.dataset.text = selectedText;
    } else {
        if (floatingButton && !isInsideLexiUI(event.target)) {
            floatingButton.style.display = 'none';
        }
    }
});

function isInsideLexiUI(element) {
    return element.closest('#lexiai-floating-btn') || element.closest('#lexiai-result-modal');
}

function createFloatingButton() {
    floatingButton = document.createElement('div');
    floatingButton.id = 'lexiai-floating-btn';
    floatingButton.innerHTML = `
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="LexiAI" style="width: 20px; height: 20px;">
        <span>Analyze JD</span>
    `;
    
    Object.assign(floatingButton.style, {
        position: 'absolute',
        zIndex: '2147483647',
        display: 'none',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        borderRadius: '12px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 'bold',
        transition: 'transform 0.2s ease',
        border: 'none',
        userSelect: 'none'
    });

    floatingButton.addEventListener('click', async () => {
        const text = floatingButton.dataset.text;
        floatingButton.style.display = 'none';
        showResultModal(text);
    });

    document.body.appendChild(floatingButton);
}

async function showResultModal(jdText) {
    if (!resultModal) {
        createResultModal();
    }
    
    resultModal.style.display = 'block';
    const content = resultModal.querySelector('#lexiai-modal-content');
    const loading = resultModal.querySelector('#lexiai-modal-loading');
    
    content.style.display = 'none';
    loading.style.display = 'block';

    try {
        const data = await chrome.storage.local.get(['gemini_api_key', 'cv_text']);
        if (!data.gemini_api_key || !data.cv_text) {
            content.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p style="color: #a1a1aa; font-size: 14px;">Please set your API Key and CV in the LexiAI extension popup first.</p>
                </div>
            `;
            content.style.display = 'block';
            loading.style.display = 'none';
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

            CV: ${data.cv_text}
            JD: ${jdText}
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${data.gemini_api_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            })
        });

        const result = await response.json();
        const analysis = JSON.parse(result.candidates[0].content.parts[0].text);

        content.innerHTML = `
            <div style="padding: 24px; color: white;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 800;">LexiAI Analysis</h2>
                    <div style="background: rgba(99, 102, 241, 0.2); color: #6366f1; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 14px;">
                        ${analysis.score}% Match
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 12px; text-transform: uppercase; color: #6366f1; margin-bottom: 12px; letter-spacing: 1px;">Missing Skills</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${analysis.missing_skills.map(skill => `
                            <span style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 8px; font-size: 12px;">${skill}</span>
                        `).join('')}
                    </div>
                </div>

                <button id="lexiai-close-modal" style="width: 100%; background: #6366f1; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer;">
                    Got it!
                </button>
            </div>
        `;
        
        content.style.display = 'block';
        loading.style.display = 'none';

        content.querySelector('#lexiai-close-modal').onclick = () => {
            resultModal.style.display = 'none';
        };

    } catch (error) {
        content.innerHTML = '<p style="padding: 20px; color: #ef4444;">Error analyzing JD. Please check your API Key.</p>';
        content.style.display = 'block';
        loading.style.display = 'none';
    }
}

function createResultModal() {
    resultModal = document.createElement('div');
    resultModal.id = 'lexiai-result-modal';
    
    Object.assign(resultModal.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '350px',
        backgroundColor: '#0a0a0a',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: '2147483647',
        display: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
    });

    resultModal.innerHTML = `
        <div id="lexiai-modal-loading" style="padding: 40px; text-align: center;">
            <div style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #6366f1; border-radius: 50%; animation: lexiai-spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: #a1a1aa; font-size: 13px; margin: 0;">Analyzing with Gemini...</p>
        </div>
        <div id="lexiai-modal-content"></div>
        <style>
            @keyframes lexiai-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;

    document.body.appendChild(resultModal);
}
