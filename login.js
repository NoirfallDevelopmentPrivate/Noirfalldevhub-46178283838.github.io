module.exports.handler = async (event) => {
    const { username, password } = JSON.parse(event.body);

    // Add your authentication logic here
    if (username === 'admin' && password === 'admin') {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Login successful' }),
        };
    } else {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Invalid username or password' }),
        };
    }
};
