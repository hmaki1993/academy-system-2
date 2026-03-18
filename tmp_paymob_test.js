
const apiKey = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T0RFek5EQXlMQ0p1WVcxbElqb2lhVzVwZEdsaGJDSjkuUXdNT3FnZk5KNjBYekh0RU8xczlhVURzb05fM04wWGpoX1VvNEsxcWJxOHBoYktlV2pDTXdhYWsxTFlXWTVzRk04V1hTa1Q1RkJKMlZzM0MyNmViYnc=";
const integrationId = 3883546;

async function testPaymob() {
    try {
        const response = await fetch("https://api.paymob.com/api/v1/intention/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                amount: 1000, // 10 EGP in cents
                currency: "EGP",
                payment_methods: [integrationId],
                billing_data: {
                    first_name: "Test",
                    last_name: "User",
                    email: "test@example.com",
                    phone_number: "01000000000"
                },
                customer: {
                    first_name: "Test",
                    last_name: "User",
                    email: "test@example.com"
                }
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

testPaymob();
