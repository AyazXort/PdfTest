let buttonsAdded = false;
const baseUrlPattern = 'https://app.gohighlevel.com/v2/location/vcLxBfw01Nmv2VnlhtND/contacts/detail';
function getIdFromUrl() {
    const path = window.location.pathname;
  

    const segments = path.split('/');
    const id = segments.pop(); 

    console.log('Extracted ID:', id); 
    return id;
}

function isTargetUrl() {
    const path = window.location.href;
    return path.startsWith(baseUrlPattern);
}


function createButton(id, text, click) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.style.backgroundColor = 'red';

    button.addEventListener('click', click);
    return button;
}

function initializeButtons() {
    if (isTargetUrl() && !buttonsAdded) {
        const containers = document.getElementsByClassName('contact-detail-nav');
        if (containers.length > 0) {
            const container = containers[0]; 

            const existingPdfButton = document.getElementById('downloadPdfBtn');
            const existingCsvButton = document.getElementById('downloadCsvBtn');
            if (existingPdfButton) container.removeChild(existingPdfButton);
            if (existingCsvButton) container.removeChild(existingCsvButton);

            const pdfButton = createButton('downloadPdfBtn', 'Download PDF', handlePdfDownload);
            const csvButton = createButton('downloadCsvBtn', 'Download CSV', handleCsvDownload);

            container.appendChild(pdfButton);
            container.appendChild(csvButton);

            buttonsAdded = true;
            console.log('Buttons added successfully');
        } else {
            console.error('Element with class contact-detail-nav not found');
        }
    } else if (!isTargetUrl() && buttonsAdded) {
        buttonsAdded = false;
    }
}

function handlePdfDownload() {
    if (isTargetUrl()) {
        const id = getIdFromUrl() 
        const apiUrl = `https://services.leadconnectorhq.com/contacts/${id}`;
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLW0wMnVhY3NpIiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1tMDJ1YWNzaSJ9LCJpYXQiOjE3MjQyNTk4MjMuNDU5LCJleHAiOjE3MjQzNDYyMjMuNDU5fQ.GasS50tqIUBZktDb9icc_JiE2Hpv6SkgBzXZRwTTzQPVsZuIqBsi6T44qOorBOMzUiHTxPhG_OMuhszFUs-O40ECP0aPT7t5ovVQv8intZ_DGcquouIVc6CoFqMZGA6gtJbe87UxsksdhksktwEFvt9I_NY5Yzy-JO5I7s20MPaEUqkV-s-1jUJO9dZZRHHpWL3IISb90CjFLj3fiu2fRO6O-pAjGBq90tJDRvSnSzUoFp6RGiSvL4oETAF7pSLOflLhLZVG5wczILeiWqRA5-gpqgJN_OO4XYKc_lI9xQ2HzfHLaXlQ1JVwt3RguYi9Dx_dJJNht_6eixLyMLTqUqs2xyPIDycOhOxrNmAT990Nc7VnXB-cD0xOcfmOp4cRjB9fTNcwBfrAZsUuVafgJ0dCG087IWLA3vPsXaE36BNs-N313Ok7bi2a8DwTqHbeXVDehMrUnUYlkIe1lROkD4M9BzPD_1UbQsNTJPhcRGyuGGify1avP9JsVKZ-IsvyVfnuys8I9KIphsK0Ho1pDCITxMaklQtLoIikIaRjNrV2FbUg7CFVf2AKETwX0keldQtsvxejN7eT2J9uoOBpGuKz73pWw2q43kKnwjdbQgeH8O1Jd_O0jf2T2sqOM0GRh3LI8zIsvFAGSYVAxYsBwOH2gSCttWnCmM4CdT4JFT4',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Version': '2021-07-28'
            }
        })
        .then(response => response.json())
        .then(jsonData => {
            if (jsonData) {
                downloadPdfFromJson(jsonData); 
            } else {
                console.error('No JSON data received for PDF conversion');
            }
        })
        .catch(error => console.error('Error downloading PDF:', error));
    } else {
        console.error('URL does not match');
    }
}

function handleCsvDownload() {
    if (isTargetUrl()) {
        const id = getIdFromUrl() 
        const apiUrl = `https://services.leadconnectorhq.com/contacts/${id}`;
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjZiM2ExYzAxODkwN2IyNzYyN2QyZDZmLW0wMnVhY3NpIiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoidmNMeEJmdzAxTm12MlZubGh0TkQiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5IiwiY29udGFjdHMucmVhZG9ubHkiLCJjb250YWN0cy53cml0ZSIsImxvY2F0aW9ucy9jdXN0b21GaWVsZHMud3JpdGUiLCJsb2NhdGlvbnMvY3VzdG9tRmllbGRzLnJlYWRvbmx5Il0sImNsaWVudCI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2ZiIsImNsaWVudEtleSI6IjY2YjNhMWMwMTg5MDdiMjc2MjdkMmQ2Zi1tMDJ1YWNzaSJ9LCJpYXQiOjE3MjQyNTk4MjMuNDU5LCJleHAiOjE3MjQzNDYyMjMuNDU5fQ.GasS50tqIUBZktDb9icc_JiE2Hpv6SkgBzXZRwTTzQPVsZuIqBsi6T44qOorBOMzUiHTxPhG_OMuhszFUs-O40ECP0aPT7t5ovVQv8intZ_DGcquouIVc6CoFqMZGA6gtJbe87UxsksdhksktwEFvt9I_NY5Yzy-JO5I7s20MPaEUqkV-s-1jUJO9dZZRHHpWL3IISb90CjFLj3fiu2fRO6O-pAjGBq90tJDRvSnSzUoFp6RGiSvL4oETAF7pSLOflLhLZVG5wczILeiWqRA5-gpqgJN_OO4XYKc_lI9xQ2HzfHLaXlQ1JVwt3RguYi9Dx_dJJNht_6eixLyMLTqUqs2xyPIDycOhOxrNmAT990Nc7VnXB-cD0xOcfmOp4cRjB9fTNcwBfrAZsUuVafgJ0dCG087IWLA3vPsXaE36BNs-N313Ok7bi2a8DwTqHbeXVDehMrUnUYlkIe1lROkD4M9BzPD_1UbQsNTJPhcRGyuGGify1avP9JsVKZ-IsvyVfnuys8I9KIphsK0Ho1pDCITxMaklQtLoIikIaRjNrV2FbUg7CFVf2AKETwX0keldQtsvxejN7eT2J9uoOBpGuKz73pWw2q43kKnwjdbQgeH8O1Jd_O0jf2T2sqOM0GRh3LI8zIsvFAGSYVAxYsBwOH2gSCttWnCmM4CdT4JFT4',
                'Content-Type': 'application/json',
                'Accept': 'application/json', 
                'Version': '2021-07-28'
            }
        })
        .then(response => response.json())
        .then(jsonData => {
            if (jsonData) {
                downloadCsvFromJson(jsonData); 
            } else {
                console.error('No JSON data received for CSV conversion');
            }
        })
        .catch(error => console.error('Error downloading CSV:', error));
    } else {
        console.error('URL does not match');
    }
}

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function flattenObject(obj, parentKey = '', result = {}) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const newKey = parentKey ? `${parentKey}_${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                flattenObject(value, newKey, result);
            } else if (Array.isArray(value)) {
                result[newKey] = value.join('|');
            } else {
                result[newKey] = value;
            }
        }
    }
    return result;
}

function convertJsonToCsv(jsonData) {
    if (typeof jsonData !== 'object' || jsonData === null) {
        console.error('Invalid JSON data for CSV conversion');
        return '';
    }

    const flattenedData = flattenObject(jsonData);

    const headers = Object.keys(flattenedData);

    const headerRow = headers.join(',');

    const row = headers.map(header => {
        const value = flattenedData[header];
        return typeof value === 'string' && value.includes(',')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
    }).join(',');

    const csvContent = [headerRow, row].join('\n');

    return csvContent;
}

function downloadCsvFromJson(jsonData) {
    const csvContent = convertJsonToCsv(jsonData);

    if (!csvContent) {
        console.error('Failed to generate CSV content');
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, 'data.csv');
}

function downloadPdfFromJson(jsonData) {
    const { jsPDF } = window.jspdf; 

    if (!jsPDF) {
        console.error('jsPDF is not loaded properly');
        return;
    }

    const doc = new jsPDF();
    const text = JSON.stringify(jsonData, null, 2);

    doc.text(text, 10, 10);
    doc.save('data.pdf');
}


const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
document.head.appendChild(script);

script.onload = () => {
    console.log('jsPDF library loaded successfully');
    initializeButtons();

    
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                initializeButtons();
            }
        }
    });

    const config = { childList: true, subtree: true };
    observer.observe(document.body, config);

    window.addEventListener('popstate', initializeButtons);
    window.addEventListener('hashchange', initializeButtons);
};


initializeButtons();
