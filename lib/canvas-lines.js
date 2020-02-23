// based on this https://vivrichards.co.uk/accessibility/automating-page-tab-flows-using-visual-testing-and-javascript
export default function drawTabbableOnCanvas(options = {}) {
    const defaultOptions = {
        circle:{
            backgroundColor: '#ff0000',
            borderColor: '#000',
            borderWidth: 1,
            fontColor: '#fff',
            fontFamily: 'Arial',
            fontSize: 10,
            size: 10,
            showNumber: true,
        },
        line:{
            color: '#000',
            width: 1,
        },
    };
    const drawOptions = {...defaultOptions, ...options};

    // 1. Scroll to top of page
    window.scrollTo(0, 0);

    // 2. Insert canvas
    const width = window.innerWidth;
    const height = getDocumentScrollHeight();
    const canvasNode = `<canvas id="tabCanvas" width="${width}" height="${height}" style="position:absolute;top:0;left:0;z-index:999999;">`;
    document.body.insertAdjacentHTML('afterbegin', canvasNode);

    // 3. Get all the elements
    const accessibleElements = tabbable();

    // 4a. Iterate over all accessibleElements and get the coordinates
    const coordinates = accessibleElements.map(node => {
        const currentElement = node.getBoundingClientRect();

        return {
            x: currentElement.left + (currentElement.width / 2),
            y: currentElement.top + (currentElement.height / 2),
        }
    });
    // 4b. Add the starting coordinates
    coordinates.unshift({x: 0, y: 0});
    // 4c. Iterate over all coordinates and draw lines and circles
    coordinates.forEach((coordinate, i) => {
        if (i === 0){
            return;
        }

        drawLine(drawOptions.line, coordinates[i-1], coordinate);
        drawCircleAndNumber(drawOptions.circle, coordinate, i);
    });

    /**
     * Draw a line
     */
    function drawLine(options, start, end) {
        const tabbableCanvasContext = document.getElementById("tabCanvas").getContext("2d");

        // Draw the line
        tabbableCanvasContext.beginPath();
        tabbableCanvasContext.globalCompositeOperation='destination-over';
        tabbableCanvasContext.lineWidth = options.width;
        tabbableCanvasContext.strokeStyle = options.color;
        tabbableCanvasContext.moveTo(start.x, start.y);
        tabbableCanvasContext.lineTo(end.x, end.y);
        tabbableCanvasContext.stroke();
    }

    /**
     * Draw a circle
     */
    function drawCircleAndNumber(options, position, i) {
        const tabbableCanvasContext = document.getElementById("tabCanvas").getContext("2d");

        // Draw circle
        tabbableCanvasContext.beginPath();
        tabbableCanvasContext.globalCompositeOperation='source-over';
        tabbableCanvasContext.fillStyle = options.backgroundColor;
        tabbableCanvasContext.arc(position.x, position.y, options.size, 0, Math.PI * 2, true);
        tabbableCanvasContext.fill();
        // Draw border
        tabbableCanvasContext.lineWidth = options.borderWidth;
        tabbableCanvasContext.strokeStyle = options.borderColor;
        tabbableCanvasContext.stroke();

        if(options.showNumber) {
            // Set the text
            tabbableCanvasContext.font = `${options.fontSize}px ${options.fontFamily}`;
            tabbableCanvasContext.textAlign = 'center';
            tabbableCanvasContext.textBaseline = 'middle';
            tabbableCanvasContext.fillStyle = options.fontColor;
            tabbableCanvasContext.fillText(i, position.x, position.y);
        }
    }

    /**
     * This is coming from https://github.com/davidtheclark/tabbable
     * and is modified a bit to work inside the browser.
     * The original module couldn't be used for injection
     */

    /**
     * Get all tabbable elements based on tabindex and then regular dom order
     */
    function tabbable() {
        let regularTabbables = [];
        let orderedTabbables = [];
        const candidateSelectors = [
            'input',
            'select',
            'textarea',
            'a[href]',
            'button',
            '[tabindex]',
            'audio[controls]',
            'video[controls]',
            '[contenteditable]:not([contenteditable="false"])',
        ].join(',');
        let candidates = document.querySelectorAll(candidateSelectors);

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];

            if (!isNodeMatchingSelectorTabbable(candidate)) {
                continue;
            }

            const candidateTabindex = getTabindex(candidate);

            if (candidateTabindex === 0) {
                regularTabbables.push(candidate);
            } else {
                orderedTabbables.push({
                    documentOrder: i,
                    tabIndex: candidateTabindex,
                    node: candidate,
                });
            }
        }

        return [...(orderedTabbables.sort(sortOrderedTabbables).map(a => a.node).concat(regularTabbables))];
    }

    /**
     * Is the node tabbable
     */
    function isNodeMatchingSelectorTabbable(node) {
        return !(
            !isNodeMatchingSelectorFocusable(node) ||
            isNonTabbableRadio(node) ||
            getTabindex(node) < 0
        );
    }

    /**
     * Check if the node has a focused state
     */
    function isNodeMatchingSelectorFocusable(node) {
        return !(node.disabled || isHiddenInput(node) || isHidden(node));
    }

    /**
     * Get the tab index of the node
     */
    function getTabindex(node) {
        const tabindexAttr = parseInt(node.getAttribute('tabindex'), 10);

        if (!isNaN(tabindexAttr)) {
            return tabindexAttr;
        }
        // Browsers do not return `tabIndex` correctly for contentEditable nodes;
        // so if they don't have a tabindex attribute specifically set, assume it's 0.
        if (isContentEditable(node)) {
            return 0;
        }

        return node.tabIndex;
    }

    /**
     * Return ordered tabbable nodes
     */
    function sortOrderedTabbables(nodeA, nodeB) {
        return nodeA.tabIndex === nodeB.tabIndex
            ? nodeA.documentOrder - nodeB.documentOrder
            : nodeA.tabIndex - nodeB.tabIndex;
    }

    /**
     * Is the content editable
     */
    function isContentEditable(node) {
        return node.contentEditable === 'true';
    }

    /**
     * Is the node an input
     */
    function isInput(node) {
        return node.tagName === 'INPUT';
    }

    /**
     * Is the input hidden
     */
    function isHiddenInput(node) {
        return isInput(node) && node.type === 'hidden';
    }

    /**
     * Is the node a radio input
     */
    function isRadio(node) {
        return isInput(node) && node.type === 'radio';
    }

    /**
     * Is the node a radio input and can it be tabbed
     */
    function isNonTabbableRadio(node) {
        return isRadio(node) && !isTabbableRadio(node);
    }

    /**
     * Get the checked radio input
     */
    function getCheckedRadio(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].checked) {
                return nodes[i];
            }
        }
    }

    /**
     * Is the radio input tabbable
     */
    function isTabbableRadio(node) {
        if (!node.name) {
            return true;
        }
        // This won't account for the edge case where you have radio groups with the same
        // in separate forms on the same page.
        let radioSet = node.ownerDocument.querySelectorAll(
            'input[type="radio"][name="' + node.name + '"]'
        );
        let checked = getCheckedRadio(radioSet);

        return !checked || checked === node;
    }

    /**
     * Is the node hidden
     */
    function isHidden(node) {
        // offsetParent being null will allow detecting cases where an element is invisible or inside an invisible element,
        // as long as the element does not use position: fixed. For them, their visibility has to be checked directly as well.
        return (
            node.offsetParent === null || getComputedStyle(node).visibility === 'hidden'
        );
    }

    /**
     * Get the document scroll height
     */
    function getDocumentScrollHeight() {
        const viewPortHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const scrollHeight = document.documentElement.scrollHeight;
        const bodyScrollHeight = document.body.scrollHeight;

        // In some situations the default scrollheight can be equal to the viewport height
        // but the body scroll height can be different, then return that one
        if ((viewPortHeight === scrollHeight) && (bodyScrollHeight > scrollHeight)) {
            return bodyScrollHeight;
        }

        // In some cases we can have a challenge determining the height of the page
        // due to for example a `vh` property on the body element.
        // If that is the case we need to walk over all the elements and determine the highest element
        // this is a very time consuming thing, so our last hope :(
        let pageHeight = 0;
        let largestNodeElement = document.querySelector('body');

        if (bodyScrollHeight === scrollHeight && bodyScrollHeight === viewPortHeight) {
            findHighestNode(document.documentElement.childNodes);

            // There could be some elements above this largest element,
            // add that on top
            return pageHeight + largestNodeElement.getBoundingClientRect().top;
        }

        // The scrollHeight is good enough
        return scrollHeight;

        /**
         * Find the largest html element on the page
         */
        function findHighestNode(nodesList) {
            for (let i = nodesList.length - 1; i >= 0; i--) {
                const currentNode = nodesList[i];

                /* istanbul ignore next */
                if (currentNode.scrollHeight && currentNode.clientHeight) {
                    const elHeight = Math.max(currentNode.scrollHeight, currentNode.clientHeight);
                    pageHeight = Math.max(elHeight, pageHeight);
                    if (elHeight === pageHeight) {
                        largestNodeElement = currentNode;
                    }
                }

                if (currentNode.childNodes.length) {
                    findHighestNode(currentNode.childNodes);
                }
            }
        }
    }
}