var Crossword = function(data, options){
	this.data = data;
	this.wrapper;
	this.clue;
	this.grid = [];
	this.clues = {across: [], down: []};
	this.numbers = []; // TODO
	this.width = this.height = 0;
	this.currentCell;
	this.direction = "across";
	
	this.options = options || {}; // We'll initialize these after crawling the data as we'll need the width/height/etc..
	
	var orientation, clues, clue, char, row, col, cell;
	var scope = this;
	
	// Initialize options:
	
	// Target can be either a dom element reference or a selector; default is document.body
	
	this.options.target = this.options.target ? typeof this.options.target === "object" ? this.options.target : document.querySelector(this.options.target) : document.body;
	
	// Utility methods
	
	this.util = {
		bind: function(el, type, handler){
			if(el.addEventListener){
				el.addEventListener(type, handler, false);
			}else{
				if(el.attachEvent){
					el.attachEvent("on" + type, handler);
				}
			}
		},
		
		hasClass: function(el, c){
			if(!el || !el.className || !c) return;
			return el.className.indexOf(c) !== -1;
		},
		
		addClass: function(el, c){
			if(!el || !el.className || !c) return;
			scope.util.removeClass(el, c);
			el.className = el.className + " " + c;
		},
		
		removeClass: function(el, c){
			if(!el || !el.className || !c) return;
			el.className = el.className.replace(new RegExp("(\\b" + c + "\\b)", "g"), "");	// Remove the classname
			el.className = el.className.replace(new RegExp("\\s+", "g"), " "); 				// Replace multiple whitespace chars with a single space
			el.classname = el.className.replace(new RegExp("((^\\s+)|(\\s+$))", "g"), ""); 	// Remove trailing whitespace
		}
	}
	
	// Return a cell object based on the data attributes of a dom element
	
	this.getCellFromEl = function(el){
		return scope.grid[el["data-row"]][el["data-col"]];
	}
	
	// Update selected cell and associated visual elements
	
	this.selectCell = function(cell){
		if(!cell) return;
		
		var row, col, ii;
		
		// Switch direction if we're clicking on the current cell again
		
		if(cell == scope.currentCell) scope.direction = scope.direction === "across" ? "down" : "across";
		
		// Now we can switch in the new cell
		
		scope.currentCell = cell;
		
		// Remove all highlights
		// FIXME: More than a little ineffecient, but shouldnt be noticable on any reasonably sized puzzle
		
		for(var ii = 0; ii < scope.wrapper.childNodes.length; ii++){
			scope.util.removeClass(scope.wrapper.childNodes[ii], "selected");
			scope.util.removeClass(scope.wrapper.childNodes[ii], "selected-clue");
		}
		
		// Highlight all letters in current clue
		
		row = scope.currentCell.row;
		col = scope.currentCell.col;
		
		switch(scope.direction){
			case "across":
				do{
					scope.util.addClass(scope.grid[row][col].el, "selected-clue");
				}while(col++, scope.grid[row][col]);
				
				col = scope.currentCell.col;
				
				do{
					scope.util.addClass(scope.grid[row][col].el, "selected-clue");
				}while(col--, scope.grid[row][col]);
			break;
			
			case "down":
				do{
					scope.util.addClass(scope.grid[row][col].el, "selected-clue");
				}while(row++, scope.grid[row] && scope.grid[row][col]);
				
				row = scope.currentCell.row;
				
				do{
					scope.util.addClass(scope.grid[row][col].el, "selected-clue");
				}while(row--, scope.grid[row] && scope.grid[row][col]);
			break;
		}
		
		// Highlight cell
		
		scope.util.removeClass(scope.currentCell.el, "selected");
		scope.util.addClass(cell.el, "selected");
		
		// Update clue
		
		scope.clue.innerHTML = scope.direction === "across" ? scope.currentCell.clue.across : scope.currentCell.clue.down;
	}
	
	// Check puzzle and optionally style or remove errors
	
	this.check = function(mark, remove){
	
	}
	
	// Retrieve the next cell with no letter, skipping blanks and already filled in cells and taking direction into consideration
	
	this.getNextCell = function(){
		var row = scope.currentCell ? scope.currentCell.row : scope.direction == "down" ? -1 : 0;
		var col = scope.currentCell ? scope.currentCell.col : scope.direction == "across" ? -1 : 0;
		var count = 0; // Make sure we don't enter an infinite loop
		
		switch(scope.direction){
			case "across":
				do{
					if(col === scope.width - 1){
						col = 0;
						row += 1;
					}else{
						col += 1;
					}
					if(row === scope.height - 1){
						col = 0;
						row = 0;
					}
					count++;
				}while((!scope.grid[row][col] || scope.grid[row][col].el.childNodes[0].innerHTML !== "") && count < scope.width * scope.height);
			break;
			
			case "down":
				do{
					if(row >= scope.height - 2){ // FIXME: Why is this -2? Magic numbers make me sad :(
						row = 0;
						col += 1;
					}else{
						row += 1;
					}
					if(col === scope.width - 1){
						row = 0;
						col = 0;
					}
					count++;
				}while((!scope.grid[row][col] || scope.grid[row][col].el.childNodes[0].innerHTML !== "") && count < scope.width * scope.height);
			break;
		}
		
		return scope.grid[row][col];
	}
	
	// Retrieve previous cell, skipping blanks
	
	this.getPreviousCell = function(){
		var row = scope.currentCell.row;
		var col = scope.currentCell.col;
		do{
			if(scope.direction == "across"){
				col -= 1;
				if(col < 0){
					row -= 1;
					col = scope.width - 1;
					if(row < 0){
						row = scope.height - 2;
					}
				}
			}else{
				row -= 1;
				if(row < 0){
					row -= 1;
					row = scope.height - 1;
					if(col < 0){
						col = scope.width - 1;
					}
				}
			}
		}while(!scope.grid[row][col]);
		return scope.grid[row][col];
	}
	
	// Crawl data and populate grid
	
	for(orientation in this.data.clues){
		clues = this.data.clues[orientation]; // Handle subsections, ie: across/down
		for(clue in clues){
			clue = clues[clue];
			
			switch(orientation){
				case "across":
					// Track max width
					if(this.width < clue.column + clue.answer.length) this.width = clue.column + clue.answer.length;	
					
					// Insert characters into grid
					for(char in clue.answer){
						col = clue.column + parseInt(char);
						row = clue.row;
						char = clue.answer[char];
						
						if(!this.grid[row - 1]) this.grid[row - 1] = [];
						if(!this.grid[row - 1][col - 1]){
							this.grid[row - 1][col - 1] = {
								letter: char,
								answer: {across: clue.answer},
								clue: {across: clue.clue},
								number: clue.number,
								row: row - 1,
								col: col - 1,
								el: null
							};
						}else{
							this.grid[row - 1][col - 1].answer.across = clue.answer;
							this.grid[row - 1][col - 1].answer.clue = clue.clue;
						}
					}
				break;
				
				case "down":
					// Track max height
					if(this.height < clue.row + clue.answer.length) this.height = clue.row + clue.answer.length;
					
					// Insert characters into grid
					for(char in clue.answer){
						col = clue.column;
						row = clue.row + parseInt(char);
						char = clue.answer[char];
						
						if(!this.grid[row - 1]) this.grid[row - 1] = [];
						if(!this.grid[row - 1][col - 1]){
							this.grid[row - 1][col - 1] = {
								letter: char,
								answer: {down: clue.answer},
								clue: {down: clue.clue},
								number: clue.number,
								row: row - 1,
								col: col - 1,
								el: null
							};
						}else{
							this.grid[row - 1][col - 1].answer.down = clue.answer;
							this.grid[row - 1][col - 1].clue.down = clue.clue;
						}
					}
				break;
			}
		}
	}
	
	// Create wrapper element
	
	this.wrapper = document.createElement("div");
	this.options.target.appendChild(scope.wrapper);
	this.wrapper.className = "crossword";
	this.wrapper.tabIndex = 0; // Make div focusable so it can receive input events while not mangling the rest of the page
	
	// Create clue element
	
	this.clue = document.createElement("div");
	this.clue.className = "clue";
	this.wrapper.appendChild(scope.clue);
	
	// Update letter in current cell when user presses a key
	
	this.util.bind(this.wrapper, "keydown", function(e){
		var key = window.event? window.event.keyCode : e.which;
		if(key === 8 || key === 46){
			scope.currentCell.el.childNodes[0].innerHTML = "";
			scope.selectCell(scope.getPreviousCell());
			e.preventDefault();
			e.stopPropagation();
			return false;	
		}else{
			scope.currentCell.el.childNodes[0].innerHTML = String.fromCharCode(e.which).toUpperCase();
			scope.selectCell(scope.getNextCell());
		}
	});
	
	this.util.bind(this.wrapper, "keypress", function(e){
			e.preventDefault();
			e.stopPropagation();
			return false;	
	});
 	
 	// $(document).keypress(function(event){if (key === 8 || key === 46) {return false;}});
	// $(document).keydown(function(event){if (key === 8 || key === 46) {return false;}});
	
	// Private method for rendering the crossword
	
	var render = function(){
		var row, col, cell, ii;
	
		var cellSize = (100 / (scope.width - 1)).toFixed(4); // Calculate cell size
	
		// Render grid to target; only done the first time render is called
		// FIXME: This can probably be outside of the render function as it's all handled by CSS now
		if(!scope.rendered){
			for(row = 0; row < scope.height - 1; row++){
				for(col = 0; col < scope.width - 1; col++){
					cell = document.createElement("div");
					cell.className = "cell";
					cell["data-row"] = row;
					cell["data-col"] = col;
					if(scope.grid[row][col]){
						cell.innerHTML = "<span class='letter'></span><span class='number'></span>";
						scope.grid[row][col].el = cell;						
					}else{
						scope.util.addClass(cell, "empty");
					}
					
					cell.style.width = cellSize + "%";
					cell.style.paddingBottom = (cellSize / 2) + "%";
					cell.style.paddingTop = (cellSize / 2) + "%";
					
					scope.wrapper.appendChild(cell);
					
					// Update selected cell when clicked
					scope.util.bind(cell, "click", function(){
						scope.selectCell(scope.getCellFromEl(this));
					});
				}
			}
			
			scope.selectCell(scope.getNextCell()); // Set default cell
		}
		scope.rendered = true;
				
		// Adjust font size
		
		scope.wrapper.style.fontSize = (scope.wrapper.offsetWidth / (scope.width - 1) / 2).toFixed(2) + "px";
	}
	
	render(); // Initial render
	this.util.bind(window, "resize", render); // Re-render when window resizes
	
}