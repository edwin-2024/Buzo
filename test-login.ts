const testLogin = async () => {
    try {
        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: "admin@buzo.com",
                password: "password123"
            })
        });
        const text = await response.text();
        console.log(response.status, text);
    } catch (e) {
        console.error(e);
    }
}
testLogin();
