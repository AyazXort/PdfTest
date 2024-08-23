function createCombinedSlider() {
    const formInfoElement = document.getElementById('form_info');
    if (!formInfoElement) {
        console.error('Element with id "form_info" not found.');
        return;
    }

    const combinedSliderContainer = document.createElement('div');
    combinedSliderContainer.id = 'combined-slider-container';
    combinedSliderContainer.className = 'slider-container';

    const heading = document.createElement('h3');
    heading.textContent = 'Details of the Form';

    const slider = document.createElement('div');
    slider.id = 'combined-slider';

    combinedSliderContainer.appendChild(heading);
    combinedSliderContainer.appendChild(slider);

    formInfoElement.appendChild(combinedSliderContainer);
}

function updateCombinedSlider() {
    const combinedSlider = document.getElementById('combined-slider');
    if (!combinedSlider) {
        console.error('Combined slider element not found.');
        return;
    }

    let combinedDataHtml = '';
    document.querySelectorAll('.fields-container').forEach((form) => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (!input) {
                console.error('Input element is undefined.');
                return;
            }

           
            let label = 'Input';
            const id = input.id;

           
            if (id) {
                const associatedLabel = document.querySelector(`label[for="${id}"]`);
                console.log(associatedLabel,"associatedLabel")
                if (associatedLabel) {
                    label = associatedLabel.textContent.trim();
                } else {
                 
                    const container = input.closest('.form-builder--item-input');
                    if (container) {
                        const labelElement = container.querySelector('label');
                        if (labelElement) {
                            label = labelElement.textContent.trim();
                        }
                    }
                }
            }

          
            if (label === 'Input') {
                const name = input.name;
                if (name) {
                    label = name;
                }
            }

         
            let value;
            switch (input.type) {
                case 'checkbox':
                    value = input.checked ? input.value : 'Not Selected';

                    break;
                case 'radio':
                    if (input.checked) {
                        value = input.value;
                    }
                    break;
                default:
                    value = input.value || 'Not Selected';
            }

            
            if (input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
                value = input.value || 'Not Selected';
            }

          
            if (value !== undefined && value !== null) {
                combinedDataHtml += `<p><strong>${label}:</strong> ${value}</p>`;
            }
        });

        combinedDataHtml += '<hr>';
    });

    combinedSlider.innerHTML = combinedDataHtml;
}


function removeIndividualSliders() {
    document.querySelectorAll('.slider-container').forEach(slider => {
        if (slider.id !== 'combined-slider-container') {
            slider.remove();
        }
    });
}


function setupObservers() {
    const forms = document.querySelectorAll('.fields-container');

    forms.forEach((form) => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateCombinedSlider(); 
            });
        });
    });

    createCombinedSlider();
    updateCombinedSlider();
    removeIndividualSliders();
}

function observeClassChanges() {
    const targetNode = document.body;
    const config = { attributes: true, childList: true, subtree: true };

    const callback = (mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                console.log('Class attribute changed.');
                updateCombinedSlider();
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}


setupObservers();
observeClassChanges();
