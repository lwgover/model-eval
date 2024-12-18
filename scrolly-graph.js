document.addEventListener("DOMContentLoaded", function () {
    console.log("scrolly-graph.js loaded");

    // Specify the chart’s dimensions.
    const width = 1000;
    const height = 500;
    const margin = { top: 10, right: 10, bottom: 50, left: 10 };
    var curr_score = 'partyscore'

    var allowDistro = false;
    var allowValidation = false;
    var colorDots = false;
    var lineIsMovable = false;
    var lockClassification = false;
    var lockClassification4real = false;
    var allowDots = false;

    var lineX = 500;
    var scaledLineX = 50;


    // Create nodes with partyscore ranging from 0 to 100.
    const nodes = Array.from({ length: 100 }, () => createNode());

    // Sample data for the initial ROC curve
    let initialROCData = [];
    let ROCData = Array.from({ length: 102 }, (_, i) => ({ tpr: 0, fpr: i / 102 }));
    let curr_auc = 0;


    /******************************************
     *                 D3 things
     ******************************************/

    // Creates the SVG container.
    const svg = d3.select("#classification-stationary")
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "width: 100%; height: auto; font: 12px 'Lato', sans-serif;");

    const confusion_matrix = d3.select("#confusion-matrix")
        .attr("viewBox", [0, 0, 1000, 1000])
        .attr("style", "width: 70%; height: auto; font: 48px 'Lato', sans-serif;");

    const initialROCChart = d3.select("#initial-roc-chart")
        .attr("viewBox", [0, 0, 500, 500])
        .attr("style", "width: 100%; height: auto; font: 48px 'Lato', sans-serif;");

    const ROCChart = d3.select("#roc-chart")
        .attr("viewBox", [0, 0, 500, 500])
        .attr("style", "width: 100%; height: auto; font: 48px 'Lato', sans-serif;");

    // find true and positive rate texts
    const truePositiveText = d3.select("#true-positive-rate");
    const falsePositiveText = d3.select("#false-positive-rate");
    const truePositiveText2 = d3.select("#true-positive-rate2");
    const falsePositiveText2 = d3.select("#false-positive-rate2");
    const populationText = d3.select("#percentage-of-population");
    const nIncorrectText = d3.select("#number-of-fp");

    /******************************************
     *                 X Scale Things
     ******************************************/

    // Define the x scale.
    const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([100, 900]);

    // Create an axis group and append it to the svg.
    const xAxis = d3.axisBottom(xScale).ticks(10);

    const axisGroup = svg.append("g")
        .attr("transform", `translate(0,250)`)
        .call(xAxis);

    // Style the axis line to be dotted.
    axisGroup.selectAll("line")
        .style("stroke-dasharray", ("3, 3"));

    // Style the axis path to be dotted.
    axisGroup.selectAll("path")
        .style("stroke-dasharray", ("3, 3"));

    // Style the text labels.
    axisGroup.selectAll("text")
        .style("font-size", "16px")
        .style("fill", "#555");

    const sim = d3.forceSimulation(nodes)
        .force("x", d3.forceX(d => xScale(d[curr_score])))
        .force("y", d3.forceY(height / 2))
        .force("collide", d3.forceCollide(10));

    let bubbleGroup = svg.select('g.bubble-group');

    if (bubbleGroup.empty()) {
        bubbleGroup = svg.append("g").attr('class', 'bubble-group');
    }

    bubbleGroup.attr('opacity', 1).raise();
    // Update node positions.
    sim.on("tick", () => {

        bubbleGroup.attr('class', 'real')
        const u = bubbleGroup.selectAll('circle')
            .data(nodes);

        u.enter()
            .append('circle')
            .attr('r', 10)
            .merge(u)
            .transition()
            .duration(200) // Set transition duration
            .ease(d3.easeCubicOut) // Set easing function
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('fill', d => colorDots ? (d.party === 'D' ? '#10019E' : '#B30000') : '#3F3F3F');

        u.exit().remove();
    });
    function refreshSim() {
        sim.restart();
    }

    /******************************************
     * Mouse Line
     ******************************************/

    let lineGroup = svg.select('g.line-group');

    if (lineGroup.empty()) {
        lineGroup = svg.append("g").attr('class', 'line-group').attr('opacity', '0');
    }

    let repBox = lineGroup.select('.rep-box');
    if (repBox.empty()) {
        repBox = lineGroup.append('rect')
            .attr('class', 'rep-box')
            .attr('x', '100')
            .attr('y', '0')
            .attr('height', '250')
            .attr('width', (lineIsMovable ? mouseX : 500) - 100)
            .attr('fill', 'rgba(179,0,0,0.2)')
            .lower();
    }

    let demBox = lineGroup.select('.dem-box');
    if (demBox.empty()) {
        demBox = lineGroup.append('rect').attr('class', 'dem-box')
            .attr('class', 'dem-box')
            .attr('x', (lineIsMovable ? mouseX : 500))
            .attr('y', '0')
            .attr('height', '250')
            .attr('width', 800 - (lineIsMovable ? mouseX : 500) + 100)
            .attr('fill', 'rgba(16,1,158,0.2)')
            .lower();
    }
    let verticalLine = lineGroup.select('.the-line');
    if (verticalLine.empty()) {
        verticalLine = lineGroup.append('line')
            .attr('class', 'the-line')
            .attr('y1', 0)
            .attr('y2', 250)
            .attr('stroke-dasharray', '10')
            .style('stroke', '#7F7F7F')
            .style('stroke-width', 2.5)
            .style('pointer-events', 'none')
            .lower();
    }


    // Event listeners to track mouse movements and update the line.
    svg.on('mousemove', function (event) {
        const mouseX = d3.pointer(event, axisGroup.node())[0];
        lineX = Math.min(901, Math.max(99, mouseX))
        verticalLine.attr('x1', lineIsMovable ? lineX : 500).attr('x2', lineIsMovable ? lineX : 500);
        if (!lockClassification4real) {
            demBox
                .attr('width', 800 - (lineIsMovable ? lineX : 500) + 100)
                .attr('x', (lineIsMovable ? lineX : 500))

            repBox.attr('width', (lineIsMovable ? lineX : 500) - 100)
            scaledLineX = xScale.invert(lineX)
        }

        updateImmediateText(getConfusionScore(nodes, curr_score, 'D', scaledLineX))
        //console.log('Mouse X coordinate:', xScale.invert(mouseX));
    });

    svg.on('click', function (event) {
        if (lockClassification && !lockClassification4real) {
            lockClassification4real = true
        }

        demBox
            .transition()
            .duration(500)
            .ease(d3.easeCircleOut)
            .attr('width', 800 - (lineIsMovable ? lineX : 500) + 100)
            .attr('x', (lineIsMovable ? lineX : 500))

        repBox.transition().duration(500).ease(d3.easeCircleOut).attr('width', (lineIsMovable ? lineX : 500) - 100)
        scaledLineX = xScale.invert(lineX)
        updateConfusionMatrix(getConfusionScore(nodes, curr_score, 'D', scaledLineX)); // New data to update the confusion matrix
        //console.log('Mouse X coordinate:', xScale.invert(mouseX));
    });

    function unstickLine() {
        lineIsMovable = true;
        verticalLine.transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25)).attr('x1', lineX).attr('x2', lineX);
        demBox
            .transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25))
            .attr('width', 800 - (lineIsMovable ? lineX : 500) + 100)
            .attr('x', (lineIsMovable ? lineX : 500))

        repBox
            .transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25))
            .attr('width', (lineIsMovable ? lineX : 500) - 100)

        scaledLineX = xScale.invert(lineX)
    }

    function stickLine() {
        lineIsMovable = false;
        verticalLine
            .transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25))
            .attr('x1', 500).attr('x2', 500);
        demBox
            .transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25))
            .attr('width', 800 - (lineIsMovable ? lineX : 500) + 100)
            .attr('x', (lineIsMovable ? lineX : 500))

        repBox
            .transition()
            .duration(1500)
            .ease(d3.easeElastic.amplitude(0.8).period(0.25))
            .attr('width', (lineIsMovable ? lineX : 500) - 100)

        scaledLineX = 50;
    }
    /******************************************
     * Distro Graph
     ******************************************/

    function make_distro(input_nodes, score, min = 0, max = 100, width = 10) {
        let bins = [];
        for (let i = 0; i < max; i += width) {
            let curr_bin = 0;
            for (let j = 0; j < input_nodes.length; j++) {
                if (input_nodes[j][score] >= i && input_nodes[j][score] <= i + width) {
                    curr_bin++;
                }
            }
            bins.push(curr_bin);
        }
        return bins;
    }

    var distroData = make_distro(nodes, 'catFavorabilityScore');
    const barWidth = 10;
    const barHeightScale = d3.scaleLinear()
        .domain([0, d3.max(distroData)])
        .range([0, 200]);

    var distroData = new Array(10).fill(0);

    const distroGroup = axisGroup.append('g');

    distroGroup.selectAll("rect")
        .data(distroData)
        .enter()
        .append("rect")
        .attr("x", (d, i) => xScale(i * barWidth + 1.25))
        .attr("y", d => -barHeightScale(d)) // Adjusting y position to place bars above the axis
        .attr("width", xScale(-5)) // Subtracting 2 to create some space between bars
        .attr("height", d => barHeightScale(d))
        .attr("fill", "#d3d3d3");

    // Update function for distribution chart
    function updateDistro() {
        if (!allowDistro) {
            hideDistro();
            return;
        }
        const updatedDistroData = make_distro(nodes, curr_score);

        distroGroup.selectAll("rect")
            .data(updatedDistroData)
            .transition()
            .duration(750)
            .attr("y", d => -barHeightScale(d)) // Adjusting y position to place bars above the axis
            .attr("height", d => barHeightScale(d))
            .attr("fill", "#d3d3d3");
    }

    function hideDistro() {
        const updatedDistroData = new Array(10).fill(0);

        distroGroup.selectAll("rect")
            .data(updatedDistroData)
            .transition()
            .duration(750)
            .attr("y", d => -barHeightScale(d)) // Adjusting y position to place bars above the axis
            .attr("height", d => barHeightScale(d))
            .attr("fill", "#d3d3d3");
    }
    /******************************************
     * Validation Graph
     ******************************************/

    function make_validation(input_nodes, score, min = 0, max = 100, width = 25) {
        let bins = [];
        for (let i = 0; i < max; i += width) {
            let curr_dem_bin = 0;
            let curr_rep_bin = 0;
            for (let j = 0; j < input_nodes.length; j++) {
                if (input_nodes[j][score] >= i && input_nodes[j][score] <= i + width) {
                    if (input_nodes[j].party == 'D') {
                        curr_dem_bin++;
                    } else {
                        curr_rep_bin++;
                    }
                }
            }
            bins.push({ 'dem': curr_dem_bin, 'rep': curr_rep_bin, 'total': curr_dem_bin + curr_rep_bin });
        }
        return bins;
    }

    var validationData = make_validation(nodes, 'catFavorabilityScore');
    const validationBarWidth = 25;
    const validationBarHeightScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, 200]);

    var validationData = new Array(4).fill({ 'dem': 0, 'rep': 0, 'total': 1 });

    var validationGroup = axisGroup.select('g.validation-group')
    if (validationGroup.empty()) {
        validationGroup = axisGroup.append("g").attr('class', 'validation-group');
    }

    var repValidationGroup = validationGroup.select('g.rep-validation-group')
    if (repValidationGroup.empty()) {
        repValidationGroup = validationGroup.append("g").attr('class', 'rep-validation-group');
    }


    var demValidationGroup = validationGroup.select('g.dem-validation-group')
    if (demValidationGroup.empty()) {
        demValidationGroup = validationGroup.append("g").attr('class', 'dem-validation-group');
    }

    var textGroup = validationGroup.select('g.text-group')
    if (textGroup.empty()) {
        textGroup = validationGroup.append("g").attr('class', 'text-group');
    }

    // Dem Bars
    demValidationGroup.selectAll("rect")
        .data(validationData)
        .enter()
        .append("rect")
        .attr("x", (d, i) => xScale((i * validationBarWidth) + 2.5))
        .attr("y", d => -validationBarHeightScale(d.dem / d.total)) // Adjusting y position to place bars above the axis
        .attr("height", d => validationBarHeightScale(d.dem / d.total))
        .attr("width", xScale(7.5)) // Subtracting 2 to create some space between bars
        .attr("fill", d => d.total == 0 ? "#d3d3d3" : '#10019E');

    // Dem Bars
    repValidationGroup.selectAll("rect")
        .data(validationData)
        .enter()
        .append("rect")
        .attr("x", (d, i) => xScale((i * validationBarWidth) + 2.5))
        .attr("y", 200) // Adjusting y position to place bars above the axis
        .attr("height", d => validationBarHeightScale(d.rep / d.total))
        .attr("width", xScale(7.5)) // Subtracting 2 to create some space between bars
        .attr("fill", d => d.total == 0 ? "#d3d3d3" : '#B30000');

    // Add text to Dem Bars
    demValidationGroup.selectAll("text")
        .data(validationData)
        .enter()
        .append("text")
        .text(d => `${Math.round((d.dem / d.total) * 100)}%`)
        .attr("x", (d, i) => xScale((i * validationBarWidth) + 2.5) + xScale(7.5) / 2)
        .attr("y", d => -validationBarHeightScale(d.dem / d.total) - 10)
        .attr("text-anchor", "middle")
        .style('font-size', '20pt')
        .style('font-family', 'Lato')
        .style('font-weight', '100')
        .attr('fill', 'rgba(255,255,255,0)')
        .raise();


    // Update function for distribution chart
    function updateValidation() {
        if (!allowValidation) {
            hideValidation();
            return;
        }

        const updatedValidationData = make_validation(nodes, curr_score);

        validationGroup
            .transition()
            .duration(750)
            .attr('opacity', '0.7')

        demValidationGroup.selectAll("rect")
            .data(updatedValidationData)
            .transition()
            .duration(750)
            .attr("y", d => -validationBarHeightScale(d.dem / d.total)) // Adjusting y position to place bars above the axis
            .attr("height", d => validationBarHeightScale(d.dem / d.total))
            .attr("fill", d => d.total == 0 ? "#d3d3d3" : '#10019E');

        repValidationGroup.selectAll("rect")
            .data(updatedValidationData)
            .transition()
            .duration(750)
            .attr("y", d => -200) // Adjusting y position to place bars above the axis
            .attr("height", d => validationBarHeightScale(d.rep / d.total))
            .attr("fill", d => d.total == 0 ? "#d3d3d3" : '#B30000');

        demValidationGroup.selectAll("text")
            .data(updatedValidationData)
            .transition()
            .duration(750)
            .text(d => `${Math.round((d.dem / d.total) * 100)}%`)
            .attr('fill', 'rgba(255,255,255,1)')
    }

    function hideValidation() {
        const updatedValidationData = new Array(8).fill(0);

        validationGroup
            .transition()
            .duration(750)
            .attr('opacity', '0')

        validationGroup.selectAll("rect")
            .data(updatedValidationData)
            .transition()
            .duration(750)
            .attr("y", d => -barHeightScale(d)) // Adjusting y position to place bars above the axis
            .attr("height", d => barHeightScale(d))
            .attr("fill", d => d.total == 0 ? "#d3d3d3" : '#10019E');

        demValidationGroup.selectAll("text")
            .data(updatedValidationData)
            .transition()
            .duration(750)
            .attr('fill', 'rgba(255,255,255,0)')
    }

    function muteBubbles(opacity = 0.3) {
        bubbleGroup.transition().duration(1000).attr('opacity', opacity);
    }
    function unmuteBubbles() {
        bubbleGroup.transition().duration(1000).attr('opacity', 1);
    }
    /******************************************
     * Ordering line
     ******************************************/

    function hideLine() {
        lineGroup.transition().duration(750).style('opacity', '0')
    }

    function showLine() {
        lineGroup.transition().duration(750).style('opacity', '1')
    }

    /******************************************
     * Total and N false positives
     ******************************************/
    function updateImmediateText(confusion_data) {
        const [TP, FP, FN, TN] = confusion_data;
        const total = TP + FP + FN + TN;

        // Calculate percentages
        const percentageOfPopulation = (TP + FP) / total;
        const numberOfFP = FP / (TP + FP);

        // Function to format percentage
        const formatPercentage = d3.format(".0%");

        // Update percentage of population
        populationText.text(`This universe contains ${formatPercentage(percentageOfPopulation)} of the population`);

        // Update number of false positives
        nIncorrectText.text(`${formatPercentage(numberOfFP)} of this universe is classified incorrectly`);
    }
    /******************************************
     * Confusion Matrix
     ******************************************/
    var confusion_data = [1, 1, 1, 1]; // Example initial data: [TP, FP, FN, TN]
    var labels = ["True Positive", "False Positive", "False Negative", "True Negative"]; // Labels for each section
    var colors = ["#3F3F3F", "#3F3F3F", "#3F3F3F", "#3F3F3F"]; // Different colors for each section
    var total = d3.sum(confusion_data); // Sum of all elements

    // Size of each square in the matrix
    var squareSize = 500;

    // Create a group for each section
    var sections = confusion_matrix.selectAll("g")
        .data(confusion_data)
        .enter()
        .append("g")
        .attr("transform", (d, i) => {
            let x = (i % 2) * squareSize;
            let y = Math.floor(i / 2) * squareSize;
            return `translate(${x}, ${y})`;
        });

    // Append rectangles to each group
    sections.append("rect")
        .attr("width", squareSize)
        .attr("height", squareSize)
        .attr("fill", (d, i) => colors[i])
        .attr("opacity", d => d / total);

    // Append value text to each group
    sections.append("text")
        .attr("class", "value")
        .attr("x", squareSize / 2)
        .attr("y", (squareSize / 2) + 250)
        .attr("dy", "-1em")
        .attr("text-anchor", "middle")
        .attr("fill", d => d / total > 0.5 ? "#fff" : "#3F3F3F")
        .attr("font-size", "200px")
        .text(d => d);

    // Append label text to each group
    sections.append("text")
        .attr("class", "label")
        .attr("x", squareSize / 2)
        .attr("y", (squareSize / 2) + 50)
        .attr("dy", "1.5em")
        .attr("text-anchor", "middle")
        .attr("fill", d => d / total > 0.5 ? "#fff" : "#3F3F3F")
        .attr("font-size", "75px")
        .style('font-weight', '100')
        .text((d, i) => labels[i]);

    // Function to update the confusion matrix
    function updateConfusionMatrix(newData) {
        updateRateText(newData)
        var total = d3.sum(newData); // Calculate the new total

        // Update the data binding
        var sections = confusion_matrix.selectAll("g")
            .data(newData);

        // Update the rectangles
        sections.select("rect")
            .transition()
            .duration(1000)
            .attr("opacity", d => d / total);

        // Update the value text
        sections.select(".label")
            .transition()
            .duration(1000)
            .attr("fill", d => d / total > 0.4 ? "#fff" : "#3F3F3F")

        sections.select(".value")
            .transition()
            .duration(1000)
            .attr("fill", d => d / total > 0.4 ? "#fff" : "#3F3F3F")
            .tween("text", function (d) {
                var i = d3.interpolate(this.textContent, d);
                return function (t) {
                    this.textContent = Math.round(i(t));
                };
            });
    }

    function getConfusionScore(nodes, score, true_value = 'D', cutoff = 0.5) {
        tp = 0
        fp = 0
        tn = 0
        fn = 0
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i][score] > cutoff) {
                if (nodes[i].party == true_value) {
                    tp++;
                } else {
                    fp++;
                }
            } else {
                if (nodes[i].party == true_value) {
                    fn++;
                } else {
                    tn++;
                }
            }
        }
        return [tp, fp, fn, tn]
    }

    /******************************************
     *           Initial Roc Chart!
     ******************************************/
    // Define margins and chart dimensions for the initial ROC chart
    const initialROCMargin = { top: 20, right: 20, bottom: 50, left: 80 };
    const initialROCWidth = 500 - initialROCMargin.left - initialROCMargin.right;
    const initialROCHeight = 500 - initialROCMargin.top - initialROCMargin.bottom;

    // Create scales for the x and y axes for the initial ROC chart
    const initialROCXScale = d3.scaleLinear()
        .domain([0, 1]) // False Positive Rate from 0 to 100%
        .range([0, initialROCWidth]);

    const initialROCYScale = d3.scaleLinear()
        .domain([0, 1]) // True Positive Rate from 0 to 100%
        .range([initialROCHeight, 0]);

    // Append a group element for the chart, with margins
    var initialROCGroup = initialROCChart.select('.initial-roc-chart');
    if (initialROCGroup.empty()) {
        initialROCGroup = initialROCChart.append("g").attr('class', 'initial-roc-chart')
            .attr("transform", `translate(${initialROCMargin.left},${initialROCMargin.top})`);
    }

    // Create the x-axis for the initial ROC chart
    initialROCGroup.append("g")
        .attr("transform", `translate(0,${initialROCHeight})`)
        .call(d3.axisBottom(initialROCXScale).tickFormat(d3.format(".0%")).ticks(10))
        .selectAll("text")
        .attr("font-size", "16px");

    // Create the y-axis for the initial ROC chart
    initialROCGroup.append("g")
        .call(d3.axisLeft(initialROCYScale).tickFormat(d3.format(".0%")).ticks(10))
        .selectAll("text")
        .attr("font-size", "16px");

    // X-axis label
    initialROCGroup.append("text")
        .attr("x", initialROCWidth / 2)
        .attr("y", initialROCHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#000")
        .text("False Positive Rate");

    // Y-axis label
    initialROCGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -initialROCHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#000")
        .text("True Positive Rate");

    // Optionally, add circles at data points for the initial ROC curve
    initialROCGroup.selectAll("circle")
        .data(initialROCData)
        .enter().append("circle")
        .attr("cx", d => initialROCXScale(d.fpr))
        .attr("cy", d => initialROCYScale(d.tpr))
        .attr("r", 6)
        .attr("fill", "#3F3F3F");

    function updateInitialRoc(fpr, tpr) {
        // Add the new data point to the initialROCData array
        initialROCData.push({ fpr: fpr, tpr: tpr });

        // Select all circles and bind the updated data to them
        const circles = initialROCGroup.selectAll("circle")
            .data(initialROCData);

        // Enter new circles for new data points
        circles.enter().append("circle")
            .attr("cx", d => initialROCXScale(d.fpr))
            .attr("cy", d => initialROCYScale(d.tpr))
            .attr("r", 6)
            .attr("fill", "#3F3F3F");

        // Update existing circles
        circles
            .attr("cx", d => initialROCXScale(d.fpr))
            .attr("cy", d => initialROCYScale(d.tpr));
    }
    function clearInitialRoc() {
        // Clear the data array
        initialROCData.length = 0;

        // Remove all circles from the chart
        initialROCGroup.selectAll("circle").remove();
    }

    /******************************************
    *          Primary Roc Chart!
    ******************************************/
    // Define margins and chart dimensions for the initial ROC chart
    const ROCMargin = { top: 20, right: 20, bottom: 50, left: 80 };
    const ROCWidth = 500 - ROCMargin.left - ROCMargin.right;
    const ROCHeight = 500 - ROCMargin.top - ROCMargin.bottom;

    // Create scales for the x and y axes for the initial ROC chart
    const ROCXScale = d3.scaleLinear()
        .domain([0, 1]) // False Positive Rate from 0 to 100%
        .range([0, ROCWidth]);

    const ROCYScale = d3.scaleLinear()
        .domain([0, 1]) // True Positive Rate from 0 to 100%
        .range([ROCHeight, 0]);

    // Append a group element for the chart, with margins
    var ROCGroup = ROCChart.select('.initial-roc-chart');
    if (ROCGroup.empty()) {
        ROCGroup = ROCChart.append("g").attr('class', 'initial-roc-chart')
            .attr("transform", `translate(${ROCMargin.left},${ROCMargin.top})`);
    }

    // Create the x-axis for the initial ROC chart
    ROCGroup.append("g")
        .attr("transform", `translate(0,${ROCHeight})`)
        .call(d3.axisBottom(ROCXScale).tickFormat(d3.format(".0%")).ticks(10))
        .selectAll("text")
        .attr("font-size", "16px");

    // Create the y-axis for the initial ROC chart
    ROCGroup.append("g")
        .call(d3.axisLeft(ROCYScale).tickFormat(d3.format(".0%")).ticks(10))
        .selectAll("text")
        .attr("font-size", "16px");

    // X-axis label
    ROCGroup.append("text")
        .attr("x", ROCWidth / 2)
        .attr("y", ROCHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#000")
        .text("False Positive Rate");

    // Y-axis label
    ROCGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -ROCHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("fill", "#000")
        .text("True Positive Rate");

    // Create a line generator function
    const ROCLine = d3.line()
        .x(d => ROCXScale(d.fpr))
        .y(d => ROCYScale(d.tpr));

    // Append the initial ROC line
    ROCGroup.append("path")
        .datum(ROCData)
        .attr("class", "roc-line")
        .attr("fill", "none")
        .attr("stroke", "#3F3F3F")
        .attr("stroke-width", 3)
        .attr("d", ROCLine);

    const ROCArea = d3.area()
        .x(d => ROCXScale(d.fpr))
        .y0(ROCHeight)  // Baseline at the bottom of the chart
        .y1(d => ROCYScale(d.tpr));

    // Append the initial ROC area
    ROCGroup.append("path")
        .datum(ROCData)
        .attr("class", "roc-area")
        .attr("fill", "rgba(127, 127, 127, 0.5)")
        .attr("d", ROCArea);

    // Optionally, add circles at data points for the initial ROC curve
    ROCGroup.selectAll("circle")
        .data(ROCData)
        .enter().append("circle")
        .attr("cx", d => ROCXScale(d.fpr))
        .attr("cy", d => ROCYScale(d.tpr))
        .attr("r", 3)
        .attr("fill", "#3F3F3F");

    // Append a rounded box for displaying ROC value
    ROCGroup.append("rect")
        .attr("x", ROCWidth - 150)
        .attr("y", 380)
        .attr("width", 140)
        .attr("height", 40)
        .attr("rx", 5)  // Rounded corners
        .attr("ry", 5)
        .attr("fill", "rgba(150,150,150,1)");

    // Append text for displaying ROC value
    let rocText = ROCGroup.select('.roc-text')

    if (rocText.empty) {
        rocText = ROCGroup.append("text")
            .attr('class', 'roc-text')
            .attr("x", ROCWidth - 130)
            .attr("y", 410)
            .attr("text-anchor", "center")
            .attr("font-size", "24px")
            .attr("fill", "rgba(255,255,255,0.8)")
            .text(`AUC: ${curr_auc.toFixed(2)}`)
            .raise();
    }

    function clearROC() {
        // Clear the data array
        ROCData = Array.from({ length: 102 }, () => 0);
    }

    function getAUC(currData) {
        // Sort the data by increasing false positive rate
        currData.sort((a, b) => a.fpr - b.fpr);

        // Initialize area under curve
        let auc = 0;

        // Calculate AUC using the trapezoidal rule
        for (let i = 1; i < currData.length; i++) {
            const dx = currData[i].fpr - currData[i - 1].fpr;
            const y1 = currData[i - 1].tpr;
            const y2 = currData[i].tpr;
            auc += dx * (y1 + y2) / 2;
        }
        console.log(auc)

        return auc;
    }

    function updateROC(newROCData) {
        clearInitialRoc();
        newROCData.sort((a, b) => a.fpr - b.fpr == 0 ? a.tpr - b.tpr : a.fpr - b.fpr);

        // Update the line with a transition
        ROCGroup.select(".roc-line")
            .datum(newROCData)
            .transition()
            .duration(750) // Duration of the transition in milliseconds
            .attr("d", ROCLine);

        // Update the area with a transition
        ROCGroup.select(".roc-area")
            .datum(newROCData)
            .transition()
            .duration(750) // Duration of the transition in milliseconds
            .attr("d", ROCArea);

        // Select all circles and bind the updated data to them
        const circles = ROCGroup.selectAll("circle")
            .data(newROCData);

        // Update existing circles with a transition
        circles.transition()
            .duration(750) // Duration of the transition in milliseconds
            .attr("cx", d => ROCXScale(d.fpr))
            .attr("cy", d => ROCYScale(d.tpr));

        ROCData = newROCData;
    }

    function createRoc(score) {
        clearROC();
        curr_Data = [];
        var [TP, FP, FN, TN] = [0, 0, 0, 0];
        let truePositiveRate = 0;
        let falsePositiveRate = 0;
        curr_Data.push({ fpr: 0, tpr: 0 });
        for (let i = 0; i < nodes.length; i++) {
            cut = nodes[i][score];
            [TP, FP, FN, TN] = getConfusionScore(nodes, score, 'D', cut);
            truePositiveRate = TP / (TP + FN);
            falsePositiveRate = FP / (FP + TN);
            curr_Data.push({ fpr: falsePositiveRate, tpr: truePositiveRate });
        }
        curr_Data.push({ fpr: 1, tpr: 1 });
        curr_auc = getAUC(curr_Data)
        rocText.text(`AUC: ${curr_auc.toFixed(2)}`);
        updateROC(curr_Data);
    }



    /******************************************
    * update true and positive rate texts
    ******************************************/

    function updateRateText(confusion_data) {
        const [TP, FP, FN, TN] = confusion_data;

        // Calculate rates
        const truePositiveRate = TP / (TP + FN);
        const falsePositiveRate = FP / (FP + TN);

        // Function to format percentage
        const formatPercentage = d3.format(".2%");

        // Tween update function for text content
        function tweenText(newValue, element, label) {
            return function () {
                const currentText = this.textContent.match(/[\d\.]+/);
                const currentValue = currentText ? parseFloat(currentText[0]) / 100 : 0;
                const i = d3.interpolate(currentValue, newValue);
                return function (t) {
                    d3.select(element).text(`${label} = ${formatPercentage(i(t))}`);
                };
            };
        }

        // Update true positive rate
        truePositiveText.transition()
            .duration(1000)
            .tween("text", tweenText(truePositiveRate, truePositiveText.node(), "True Positive Rate"));

        // Update false positive rate
        falsePositiveText.transition()
            .duration(1000)
            .tween("text", tweenText(falsePositiveRate, falsePositiveText.node(), "False Positive Rate"));

        truePositiveText2.transition()
            .duration(1000)
            .tween("text", tweenText(truePositiveRate, truePositiveText2.node(), "True Positive Rate"));

        // Update false positive rate
        falsePositiveText2.transition()
            .duration(1000)
            .tween("text", tweenText(falsePositiveRate, falsePositiveText2.node(), "False Positive Rate"));

        if (allowDots) {
            updateInitialRoc(falsePositiveRate, truePositiveRate);
        }
    }
    /******************************************
     * Buttons
     ******************************************/

    // Add button group
    const buttonGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height - 30})`);

    // Add buttons
    const buttons = [
        { label: "Climate Score", score: "climateScore" },
        { label: "Cat Favorability", score: "catFavorabilityScore" },
        { label: "Party Score", score: "partyscore" }
    ];

    buttonGroup.selectAll("rect")
        .data(buttons)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 200 - 300)
        .attr("width", 180)
        .attr("height", 40)
        .attr('class', 'score-button')
        .attr("y", -100)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            curr_score = d.score;
            updateDistro(curr_score);
            updateValidation(curr_score);
            sim.force("x", d3.forceX(n => xScale(n[d.score])).strength(1));
            sim.alpha(1).restart();
            clearInitialRoc();
            createRoc(curr_score)
        });

    buttonGroup.selectAll("text")
        .data(buttons)
        .enter()
        .append("text")
        .attr('class', 'score-button')
        .attr("x", (d, i) => i * 200 - 300 + 90)
        .attr("y", -78)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(d => d.label)
        .style("font-size", "24px")
        .style("fill", "white")
        .style("pointer-events", "none")
        .style("font-family", "Lato")
        .style("font-weight", "100");

    /******************************************
     * Helper Functions and things
     ******************************************/
    function createNode() {
        let node = {};
        node.party = Math.random() > 0.5 ? 'D' : 'R';
        node.partyscore = Math.max(0, Math.min(1, gaussianRandom(node.party === 'D' ? 0.75 : 0.25, 0.2))) * 100;
        node.catFavorabilityScore = Math.max(0, Math.min(1, gaussianRandom(0.5, 0.16666))) * 100;
        node.climateScore = Math.max(0, Math.min(1, gaussianRandom(node.partyscore / 100, 0.2))) * 100;
        return node;
    }

    function gaussianRandom(mean = 0, stdev = 1) {
        const u = 1 - Math.random(); // Converting [0,1) to (0,1]
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        // Transform to the desired mean and standard deviation:
        return z * stdev + mean;
    }

    /******************************************
     * EXTERNAL STEP FUNCTIONS
     ******************************************/

    function step0() {
        colorDots = false;
        allowDistro = false;
        allowValidation = false;
        lineIsMovable = false;
        refreshSim();
        updateDistro();
        updateValidation();
        hideLine();
        unmuteBubbles();
    }

    function step1() {
        colorDots = true;
        allowDistro = false;
        allowValidation = false;
        lineIsMovable = false;
        refreshSim();
        updateDistro();
        updateValidation();
        hideLine();
        unmuteBubbles();
        colorDots = true;
    }
    function step2() {
        colorDots = true;
        allowDistro = true;
        allowValidation = false;
        lineIsMovable = false;
        refreshSim();
        updateDistro();
        updateValidation();
        hideLine();
        muteBubbles(0.8);
    }
    function step3() {
        colorDots = true;
        allowDistro = false;
        allowValidation = true;
        lineIsMovable = false;
        refreshSim();
        updateDistro();
        updateValidation();
        hideLine();
        muteBubbles();
        stickLine();
    }
    function step4() {
        colorDots = true;
        allowDistro = false;
        allowValidation = false;
        lineIsMovable = false;
        lockClassification = false;
        lockClassification4real = false;
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        unmuteBubbles();
        stickLine();
    }
    function step5() {
        colorDots = true;
        allowDistro = false;
        allowValidation = false;
        lockClassification = false;
        lockClassification4real = false;
        unstickLine();
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        muteBubbles(0.6);
    }
    function step6() {
        colorDots = true;
        allowDistro = false;
        allowValidation = false;
        lockClassification = true;
        lockClassification4real = false;
        unstickLine();
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        muteBubbles(0.8);
    }
    function step7() {
        colorDots = true;
        allowDots = false;
        allowDistro = false;
        allowValidation = false;
        lockClassification = true;
        lockClassification4real = false;
        unstickLine();
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        muteBubbles(0.8);
    }
    function step8() {
        colorDots = true;
        allowDots = true;
        allowDistro = false;
        allowValidation = false;
        unstickLine();
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        muteBubbles(0.8);
        clearInitialRoc();
    }
    function step9() {
        colorDots = true;
        allowDistro = false;
        allowDots = false;
        allowValidation = false;
        unstickLine();
        refreshSim();
        updateDistro();
        updateValidation();
        showLine();
        muteBubbles(0.8);
        createRoc(curr_score);
    }

    // Make functions global
    window.step0 = step0;
    window.step1 = step1;
    window.step2 = step2;
    window.step3 = step3;
    window.step4 = step4;
    window.step5 = step5;
    window.step6 = step6;
    window.step7 = step7;
    window.step8 = step8;
    window.step9 = step9;
    hideDistro();

    updateConfusionMatrix(getConfusionScore(nodes, curr_score, 'D', scaledLineX)); // New data to update the confusion matrix
});

