// Use built-in fetch available in Node 18+
async function createIframe() {
    // V3 APIs use the standard API Key, not the Secret Key
    const apiKey = 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T0RFek5EQXlMQ0p1WVcxbElqb2lhVzVwZEdsaGJDSjkuUXdNT3FnZk5KNjBYekh0RU8xczlhVURzb05fM04wWGpoX1VvNEsxcWJxOHBoYktlV2pDTXdhYWsxTFlXWTVzRk04V1hTa1Q1RkJKMlZzM0MyNmViYnc=';
    console.log("Creating Iframe...");
    try {
        // 1. Get Auth Token first
        const authReq = await fetch("https://accept.paymob.com/api/auth/tokens", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey })
        });
        const authData = await authReq.json();
        if (!authReq.ok) throw new Error("Auth failed");
        
        // 2. Create Iframe using the Auth Token
        const response = await fetch('https://accept.paymob.com/api/acceptance/iframes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.token}`
            },
            body: JSON.stringify({
                name: "API_Generated_Iframe_" + Date.now(),
                description: "Created via API bypass",
                html_content: "<div>test</div>",
                javascript_content: "console.log('test');",
                css_content: "body{}"
            })
        });
        
        const data = await response.json();
        if (data && data.id) {
            console.log("\n✅ SUCCESS! Your Iframe ID is:", data.id);
        } else {
             console.log("\n❌ Failed to get ID. Check response:");
             console.log(data)
        }
    } catch (e) {
        console.error("Script Error:", e);
    }
}

createIframe();
