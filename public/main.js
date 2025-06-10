document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE ---
    let uploadedFilePath = "";
    let pdfDoc = null;
    let currentPageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let pdfScale = 1;
    const signatureBoxes = { // Stores properties of dynamically created signature boxes
        r2: null, // Will store { element: DOM_ELEMENT, x, y, w, h, page }
        r3: null
    };

    // --- DOM ELEMENTS ---
    const fileInput = document.getElementById('role1PdfFile');
    const dropZone = document.getElementById('dropZone');
    const fileNameDisplay = document.getElementById('fileName');
    const previewArea = document.getElementById('role1Preview'); // The main PDF preview area
    const pdfNav = document.getElementById('pdfNav');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    // Signature box input fields
    const r2WidgetX = document.getElementById('r2-widgetX');
    const r2WidgetY = document.getElementById('r2-widgetY');
    const r2WidgetW = document.getElementById('r2-widgetW');
    const r2WidgetH = document.getElementById('r2-widgetH');
    const r2WidgetPage = document.getElementById('r2-widgetPage');

    const r3WidgetX = document.getElementById('r3-widgetX');
    const r3WidgetY = document.getElementById('r3-widgetY');
    const r3WidgetW = document.getElementById('r3-widgetW');
    const r3WidgetH = document.getElementById('r3-widgetH');
    const r3WidgetPage = document.getElementById('r3-widgetPage');

    // Add/Remove Signature Box buttons
    const addR2SignatureBtn = document.getElementById('addR2SignatureBtn');
    const removeR2SignatureBtn = document.getElementById('removeR2SignatureBtn');
    const addR3SignatureBtn = document.getElementById('addR3SignatureBtn');
    const removeR3SignatureBtn = document.getElementById('removeR3SignatureBtn');

    // --- LOADER & TOAST UTILITY FUNCTIONS ---
    const showToast = (message, type = 'info') => {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    const showButtonLoader = (button, loadingText = 'Loading...') => {
        button.disabled = true;
        button.dataset.originalHtml = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    };

    const hideButtonLoader = (button) => {
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        }
        button.disabled = false;
    };

    const showPreviewLoader = (text) => {
        previewArea.innerHTML = `<div class="preview-placeholder"><div class="loader"></div><p style="margin-top: 1rem;">${text}</p></div>`;
    };

    const resetPreviewArea = () => {
        previewArea.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-file-pdf"></i>
                <p>Upload a PDF to preview</p>
            </div>`;
        pdfNav.style.display = 'none';
        fileNameDisplay.textContent = 'No file chosen';
        pdfDoc = null; // Reset PDF document
        currentPageNum = 1; // Reset page number
        // Remove any existing signature boxes from the DOM
        if (signatureBoxes.r2 && signatureBoxes.r2.element) signatureBoxes.r2.element.remove();
        if (signatureBoxes.r3 && signatureBoxes.r3.element) signatureBoxes.r3.element.remove();
        signatureBoxes.r2 = null; // Clear existing signature boxes data
        signatureBoxes.r3 = null;
        if (addR2SignatureBtn) addR2SignatureBtn.style.display = 'inline-flex';
        if (removeR2SignatureBtn) removeR2SignatureBtn.style.display = 'none';
        if (addR3SignatureBtn) addR3SignatureBtn.style.display = 'inline-flex';
        if (removeR3SignatureBtn) removeR3SignatureBtn.style.display = 'none';
    };

    // --- PDF RENDERING & NAVIGATION ---
    const renderPage = (num) => {
        pageRendering = true;
        pdfDoc.getPage(num).then((page) => {
            let canvas = document.getElementById('pdfCanvas');
            // Create canvas if it doesn't exist
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'pdfCanvas';
                previewArea.innerHTML = ''; // Clear placeholder
                previewArea.appendChild(canvas);
            }

            const containerWidth = previewArea.clientWidth * 0.98; // Use previewArea's width
            const viewport = page.getViewport({ scale: 1.5 });
            pdfScale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale: pdfScale });

            const context = canvas.getContext('2d');
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto 16px auto';

            const renderContext = { canvasContext: context, viewport: scaledViewport };
            page.render(renderContext).promise.then(() => {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending); // Render pending page
                    pageNumPending = null;
                }
                updateSignatureBoxVisibility(); // Update visibility after page render
            });
        });

        currentPageNum = num;
        currentPageSpan.textContent = num;
        updateNavButtons();
    };

    const queueRenderPage = (num) => {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    };

    const updateNavButtons = () => {
        if (pdfDoc) {
            prevPageBtn.disabled = currentPageNum <= 1;
            nextPageBtn.disabled = currentPageNum >= pdfDoc.numPages;
        } else {
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    };

    const onPrevPage = () => {
        if (currentPageNum > 1) {
            queueRenderPage(currentPageNum - 1);
        }
    };

    const onNextPage = () => {
        if (pdfDoc && currentPageNum < pdfDoc.numPages) {
            queueRenderPage(currentPageNum + 1);
        }
    };

    // --- FILE HANDLING ---
    const handleFile = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            return showToast('Please select a valid PDF file.', 'error');
        }

        fileNameDisplay.textContent = file.name;
        resetPreviewArea(); // Clear previous content and reset state
        showPreviewLoader('Uploading and processing PDF...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/esign/upload', { method: 'POST', body: formData });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Server upload failed.');
            }
            const result = await response.json();
            uploadedFilePath = 'uploads/' + result.filename;
            showToast('File uploaded successfully!', 'success');

            const reader = new FileReader();
            reader.onload = (e) => {
                pdfjsLib.getDocument(e.target.result).promise.then((doc) => {
                    pdfDoc = doc;
                    totalPagesSpan.textContent = pdfDoc.numPages;
                    currentPageNum = 1;

                    previewArea.innerHTML = '<canvas id="pdfCanvas"></canvas>';
                    pdfNav.style.display = 'flex';
                    pdfNav.style.justifyContent = 'center';
                    pdfNav.style.alignItems = 'center';

                    renderPage(currentPageNum);
                });
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            resetPreviewArea(); // Reset UI on failure
        }
    };

    // --- SIGNATURE BOX INTERACTIVITY ---
    const createSignatureBox = (role) => {
        if (!pdfDoc) return showToast('Please upload a PDF first.', 'warning');
        if (signatureBoxes[role]) return; // Box already exists

        const box = document.createElement('div');
        box.className = `signature-overlay ${role === 'r2' ? 'role2' : 'role3'}`;
        box.id = `sigBox-${role}`;
        box.textContent = `Sign Here (Role ${role.charAt(1)})`;
        box.setAttribute('data-role', role);

        // Add resize handles
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            box.appendChild(handle);
        });

        previewArea.appendChild(box); // Append to the main previewArea
        signatureBoxes[role] = {
            element: box,
            x: parseFloat(document.getElementById(`${role}-widgetX`).value),
            y: parseFloat(document.getElementById(`${role}-widgetY`).value),
            w: parseFloat(document.getElementById(`${role}-widgetW`).value),
            h: parseFloat(document.getElementById(`${role}-widgetH`).value),
            page: parseInt(document.getElementById(`${role}-widgetPage`).value, 10)
        };
        updateBoxFromInputs(role); // Apply initial position/size from inputs
        attachBoxEventListeners(role);

        // Update button visibility
        document.getElementById(`add${role.toUpperCase()}SignatureBtn`).style.display = 'none';
        document.getElementById(`remove${role.toUpperCase()}SignatureBtn`).style.display = 'inline-flex';
        updateSignatureBoxVisibility();
    };

    const removeSignatureBox = (role) => {
        if (signatureBoxes[role]) {
            signatureBoxes[role].element.remove();
            signatureBoxes[role] = null;
            // Reset input fields when box is removed
            document.getElementById(`${role}-widgetX`).value = '';
            document.getElementById(`${role}-widgetY`).value = '';
            document.getElementById(`${role}-widgetW`).value = '';
            document.getElementById(`${role}-widgetH`).value = '';
            document.getElementById(`${role}-widgetPage`).value = '1'; // Or default page
        }
        // Update button visibility
        document.getElementById(`add${role.toUpperCase()}SignatureBtn`).style.display = 'inline-flex';
        document.getElementById(`remove${role.toUpperCase()}SignatureBtn`).style.display = 'none';
    };

    // Updates input fields based on the box's current position/size
    const updateInputsFromBox = (role) => {
        const box = signatureBoxes[role].element;
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) return;

        // Calculate offset relative to the canvas
        const offsetX = box.offsetLeft - canvas.offsetLeft;
        const offsetY = box.offsetTop - canvas.offsetTop;

        document.getElementById(`${role}-widgetX`).value = (offsetX / pdfScale).toFixed(2);
        document.getElementById(`${role}-widgetY`).value = (offsetY / pdfScale).toFixed(2);
        document.getElementById(`${role}-widgetW`).value = (box.offsetWidth / pdfScale).toFixed(2);
        document.getElementById(`${role}-widgetH`).value = (box.offsetHeight / pdfScale).toFixed(2);

        // Update the stored data for the box
        signatureBoxes[role].x = parseFloat(document.getElementById(`${role}-widgetX`).value);
        signatureBoxes[role].y = parseFloat(document.getElementById(`${role}-widgetY`).value);
        signatureBoxes[role].w = parseFloat(document.getElementById(`${role}-widgetW`).value);
        signatureBoxes[role].h = parseFloat(document.getElementById(`${role}-widgetH`).value);
        signatureBoxes[role].page = parseInt(document.getElementById(`${role}-widgetPage`).value, 10);
    };

    // Updates the box's position/size based on input field values
    const updateBoxFromInputs = (role) => {
        const boxInfo = signatureBoxes[role];
        if (!boxInfo || !boxInfo.element) return;

        const box = boxInfo.element;
        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) return;

        const x = parseFloat(document.getElementById(`${role}-widgetX`).value);
        const y = parseFloat(document.getElementById(`${role}-widgetY`).value);
        const w = parseFloat(document.getElementById(`${role}-widgetW`).value);
        const h = parseFloat(document.getElementById(`${role}-widgetH`).value);
        const page = parseInt(document.getElementById(`${role}-widgetPage`).value, 10);

        // Store updated values
        boxInfo.x = x;
        boxInfo.y = y;
        boxInfo.w = w;
        boxInfo.h = h;
        boxInfo.page = page;

        // Position relative to canvas, then add canvas offset
        box.style.left = `${(x * pdfScale) + canvas.offsetLeft}px`;
        box.style.top = `${(y * pdfScale) + canvas.offsetTop}px`;
        box.style.width = `${w * pdfScale}px`;
        box.style.height = `${h * pdfScale}px`;

        updateSignatureBoxVisibility();
    };

    const updateSignatureBoxVisibility = () => {
        Object.keys(signatureBoxes).forEach(role => {
            const boxInfo = signatureBoxes[role];
            if (boxInfo && boxInfo.element) {
                boxInfo.element.style.display = (boxInfo.page === currentPageNum) ? 'flex' : 'none';
            }
        });
    };

    const attachBoxEventListeners = (role) => {
        const box = signatureBoxes[role].element;
        let isDragging = false, isResizing = false;
        let startX, startY, startLeft, startTop, startWidth, startHeight;
        let activeHandle = null;

        const onMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent canvas drag if clicking box

            const target = e.target;
            if (target.classList.contains('resize-handle')) {
                isResizing = true;
                activeHandle = target.classList[1]; // e.g., 'top-left'
            } else {
                isDragging = true;
            }

            startX = e.clientX;
            startY = e.clientY;
            startLeft = box.offsetLeft;
            startTop = box.offsetTop;
            startWidth = box.offsetWidth;
            startHeight = box.offsetHeight;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging && !isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (isDragging) {
                let newLeft = startLeft + dx;
                let newTop = startTop + dy;

                // Clamp to parent (previewArea) boundaries
                const parentRect = previewArea.getBoundingClientRect(); // Get actual previewArea rect
                const boxRect = box.getBoundingClientRect();

                // Adjust for canvas position relative to previewArea if needed, though canvas is usually directly inside
                const canvas = document.getElementById('pdfCanvas');
                const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, right: previewArea.clientWidth, bottom: previewArea.clientHeight };

                // Calculate limits based on canvas dimensions within the previewArea
                const minX = canvas.offsetLeft;
                const minY = canvas.offsetTop;
                const maxX = canvas.offsetLeft + canvas.width - boxRect.width;
                const maxY = canvas.offsetTop + canvas.height - boxRect.height;

                newLeft = Math.max(minX, Math.min(newLeft, maxX));
                newTop = Math.max(minY, Math.min(newTop, maxY));

                box.style.left = `${newLeft}px`;
                box.style.top = `${newTop}px`;
            } else if (isResizing && activeHandle) {
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;

                switch (activeHandle) {
                    case 'bottom-right':
                        newWidth = startWidth + dx;
                        newHeight = startHeight + dy;
                        break;
                    case 'bottom-left':
                        newWidth = startWidth - dx;
                        newLeft = startLeft + dx;
                        newHeight = startHeight + dy;
                        break;
                    case 'top-right':
                        newWidth = startWidth + dx;
                        newHeight = startHeight - dy;
                        newTop = startTop + dy;
                        break;
                    case 'top-left':
                        newWidth = startWidth - dx;
                        newLeft = startLeft + dx;
                        newHeight = startHeight - dy;
                        newTop = startTop + dy;
                        break;
                }

                // Clamp dimensions to minimum size (e.g., 20px)
                newWidth = Math.max(20, newWidth);
                newHeight = Math.max(20, newHeight);

                // Ensure box stays within canvas boundaries during resize
                const canvas = document.getElementById('pdfCanvas');
                if (canvas) {
                    const canvasRect = canvas.getBoundingClientRect();
                    const boxRect = box.getBoundingClientRect(); // Current box position after initial resize calculation

                    if (newLeft < canvas.offsetLeft) {
                        newWidth -= (canvas.offsetLeft - newLeft);
                        newLeft = canvas.offsetLeft;
                    }
                    if (newTop < canvas.offsetTop) {
                        newHeight -= (canvas.offsetTop - newTop);
                        newTop = canvas.offsetTop;
                    }
                    if (newLeft + newWidth > canvas.offsetLeft + canvas.width) {
                        newWidth = canvas.offsetLeft + canvas.width - newLeft;
                    }
                    if (newTop + newHeight > canvas.offsetTop + canvas.height) {
                        newHeight = canvas.offsetTop + canvas.height - newTop;
                    }
                }
                // Apply calculated styles
                box.style.width = `${newWidth}px`;
                box.style.height = `${newHeight}px`;
                box.style.left = `${newLeft}px`;
                box.style.top = `${newTop}px`;
            }
            updateInputsFromBox(role);
        };

        const onMouseUp = () => {
            isDragging = false;
            isResizing = false;
            activeHandle = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        box.addEventListener('mousedown', onMouseDown);
    };

    // --- FORM HANDLING ---
    const validateForm = () => {
        const file = fileInput.files[0];
        if (!file) {
            showToast('Please upload a PDF file', 'error');
            return false;
        }

        const role1Name = document.getElementById('role1Name').value;
        const role1Email = document.getElementById('role1Email').value;
        const role2Name = document.getElementById('role2Name').value;
        const role2Email = document.getElementById('role2Email').value;

        if (!role1Name || !role1Email || !role2Name || !role2Email) {
            showToast('Please fill in all required fields', 'error');
            return false;
        }

        if (!isValidEmail(role1Email) || !isValidEmail(role2Email)) {
            showToast('Please enter valid email addresses', 'error');
            return false;
        }

        // Check if signature boxes are placed
        if (!signatureBoxes.r2) {
            showToast('Please add and position the Signature Box for Role 2', 'error');
            return false;
        }
        if (!signatureBoxes.r3) {
            showToast('Please add and position the Signature Box for Role 3', 'error');
            return false;
        }

        return true;
    };

    const isValidEmail = async(email)=>{
        return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email); 
    }

    const initiateWorkflow = async () => {
        if (!validateForm()) return;

        if (!uploadedFilePath) {
            showToast('Please upload and preview the PDF first', 'error');
            return;
        }

        showButtonLoader(document.getElementById('initiateBtn'), "Initializing workflow...");


        // Gather form data
        const role1Name = document.getElementById('role1Name').value;
        const role1Email = document.getElementById('role1Email').value;
        const role2Name = document.getElementById('role2Name').value;
        const role2Email = document.getElementById('role2Email').value;

        // Gather widget values for Role 2
        const r2_widget = signatureBoxes.r2 ? {
            x: signatureBoxes.r2.x,
            y: signatureBoxes.r2.y,
            w: signatureBoxes.r2.w,
            h: signatureBoxes.r2.h,
            page: signatureBoxes.r2.page,
        } : null;

        // Gather widget values for Role 3
        const r3_widget = signatureBoxes.r3 ? {
            x: signatureBoxes.r3.x,
            y: signatureBoxes.r3.y,
            w: signatureBoxes.r3.w,
            h: signatureBoxes.r3.h,
            page: signatureBoxes.r3.page,
        } : null;

        // Build payload
        const signers = [];
        if (r3_widget) {
            signers.push({
                role: "Role3",
                name: document.getElementById('role3Name').value, // Use input field directly for name/email
                email: document.getElementById('role3Email').value,
                phone: "",
                widgets: [{
                    type: "signature",
                    page: r3_widget.page,
                    x: r3_widget.x,
                    y: r3_widget.y,
                    w: r3_widget.w,
                    h: r3_widget.h,
                }, ],
            });
        }
        if (r2_widget) {
            signers.push({
                role: "Role2",
                name: role2Name,
                email: role2Email,
                phone: "",
                widgets: [{
                    type: "signature",
                    page: r2_widget.page,
                    x: r2_widget.x,
                    y: r2_widget.y,
                    w: r2_widget.w,
                    h: r2_widget.h,
                }, ],
            });
        }

        const payload = {
            filePath: uploadedFilePath,
            title: "Offer Letter",
            note: "sample Note",
            description: "sample Description",
            timeToCompleteDays: 15,
            signers: signers,
            folderId: "",
            send_email: true,
            email_subject: "",
            email_body: "",
            sendInOrder: true,
            enableOTP: false,
            enableTour: false,
            redirect_url: "",
            sender_name: "opensign™",
            sender_email: "mailer@opensignlabs.com",
            allow_modifications: false,
        };

        try {
            const response = await fetch('/esign/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            document.getElementById('initiateStatus').innerText =
                `${result.message} Template ID: ${result.objectId}.`;
            document.getElementById('templateId').value = result.objectId;

            showToast('Workflow initiated successfully', 'success');
        } catch (error) {
            console.error('Initiation error:', error);
            document.getElementById('initiateStatus').innerText = 'Error during initiation.';
            showToast('Error during workflow initiation', 'error');
        } finally {
            hideButtonLoader(document.getElementById('initiateBtn'));
        }
    };

    const role2Sign = async () => {
        const templateId = document.getElementById('templateId').value;
        const forRole = document.getElementById('forRole').value;
        const role3Email = document.getElementById('role3Email').value;
        const role3Name = document.getElementById('role3Name').value;
        const role3Phone = document.getElementById('role3Phone').value;

        if (!templateId || !role3Email) {
            showToast('Please enter Template ID and Role 3 Email.', 'error');
            return;
        }

        showButtonLoader(document.getElementById('role2SignBtn'), "Updating Role 3 and creating signing document...");

        const payload = {
            templateId: templateId,
            role: forRole,
            role3Email: role3Email,
            role3Name: role3Name,
            role3Phone: role3Phone,
        };

        try {
            const response = await fetch('/esign/role2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            const role2Email = document.getElementById('role2Email').value;

            const createLink = (email, statusElemId, roleName) => {
                const statusElem = document.getElementById(statusElemId);
                statusElem.innerHTML = "";
                const signObj = result.signurl?.find(item => item.email === email);
                if (signObj) {
                    const anchor = document.createElement("a");
                    anchor.href = signObj.url;
                    anchor.target = "_blank";
                    anchor.textContent = `Click here to sign the document (${roleName})`;
                    anchor.className = "signing-link";
                    statusElem.appendChild(anchor);
                } else {
                    statusElem.innerText = `No signing URL found for ${email}`;
                }
            };

            // Update Role 2 status
            createLink(role2Email, 'role2Status', 'Role 2');
            // Update Role 3 status
            createLink(role3Email, 'role3Status', 'Role 3');
            if (document.getElementById('documentIdRole3')) document.getElementById('documentIdRole3').innerText = "Document ready.";


        } catch (error) {
            console.error('Role 2 signing error:', error);
            document.getElementById('role2Status').innerText = 'Error during Role 2 signing.';
            showToast('Error during signing process', 'error');
        } finally {
            hideButtonLoader(document.getElementById('role2SignBtn'));
        }
    };

    // --- INITIALIZATION ---
    const initEventListeners = () => {
        // Initialize PDF.js worker
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
        }

        // File input and drag/drop
        if (fileInput) {
            fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
        }
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-over'); });
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });
        }

        // Main action buttons
        const initiateBtn = document.getElementById('initiateBtn');
        if (initiateBtn) initiateBtn.addEventListener('click', () => showButtonLoader(initiateBtn, 'Initiating...') || initiateWorkflow().finally(() => hideButtonLoader(initiateBtn)));

        const role2SignBtn = document.getElementById('role2SignBtn');
        if (role2SignBtn) role2SignBtn.addEventListener('click', () => showButtonLoader(role2SignBtn, 'Signing...') || role2Sign().finally(() => hideButtonLoader(role2SignBtn)));

        // PDF Navigation buttons
        if (prevPageBtn) prevPageBtn.addEventListener('click', onPrevPage);
        if (nextPageBtn) nextPageBtn.addEventListener('click', onNextPage);

        // Add/Remove Signature Box buttons
        if (addR2SignatureBtn) addR2SignatureBtn.addEventListener('click', () => createSignatureBox('r2'));
        if (removeR2SignatureBtn) removeR2SignatureBtn.addEventListener('click', () => removeSignatureBox('r2'));
        if (addR3SignatureBtn) addR3SignatureBtn.addEventListener('click', () => createSignatureBox('r3'));
        if (removeR3SignatureBtn) removeR3SignatureBtn.addEventListener('click', () => removeSignatureBox('r3'));

        // Input field change listeners for signature boxes
        // Use event delegation for dynamically created inputs with 'coord-input' class
        document.querySelectorAll('.coord-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const role = e.target.dataset.role;
                if (signatureBoxes[role]) { // Only update if the box actually exists
                    updateBoxFromInputs(role);
                }
            });
            input.addEventListener('input', (e) => { // Use 'input' for real-time updates as user types
                const role = e.target.dataset.role;
                if (signatureBoxes[role]) {
                    updateBoxFromInputs(role);
                }
            });
        });
    };

    initEventListeners();
});