// Update API endpoint routes and add error handling

const apiVersion = 'v3';

function fetchData(endpoint) {
    return fetch(`/api/${apiVersion}/${endpoint}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

// Example usage
// fetchData('exampleEndpoint');