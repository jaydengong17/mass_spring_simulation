// to use this code, you must be inside HTML canvas (below part),
// and have inputs for the layers and sides / width and heigh,
// layer seperation, and stiffness of the springs

const canvas = document.getElementById("canvas");
const ctx = document.getElementById("canvas").getContext("2d");
  
let Loop = null;

let nodes = [];
let springs = [];
let objects = [];

const node_radius = 5;
const damping_factor = 0.99;
const gravity = 10;
const delta_time = 0.01;

class Node{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.original_x = x;
        this.original_y = y;
        this.v_x = 0;
        this.v_y = 0;
        this.x_accel = 0;
        this.y_accel = 0;
    }

    getPos(){
        return [this.x, this.y];
    }

    moveTo(coords){
        // this is used in the setup part,
        //where the nodes need to move relative to the body's position 
        this.x = this.original_x + coords.x;
        this.y = this.original_y + coords.y;
    }

    addForce(accel){
        // assumed mass of 1
        this.x_accel += accel[0];
        this.y_accel += accel[1];
    }
    
    reset(){
        this.x = this.original_x;
        this.y = this.original_y;
        this.v_x = 0;
        this.v_y = 0;
        this.x_accel = 0;
        this.y_accel = 0;
        
        this.show()
    }

    collision(dist){
        // dist is a dictionary that tells it how far to move away
        this.v_x = 0;
        this.v_y = 0;

        this.x += dist[0];
        this.y += dist[1];
    }

    show(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, node_radius - 1, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.stroke();
    }

    set(){
        // this happens when you set the position of this node's body.
        this.original_x = this.x
        this.original_y = this.y
    }
    
    next(){
        this.v_x += this.x_accel * damping_factor * delta_time;
        this.v_y += this.y_accel * damping_factor * delta_time;
        
        this.x += this.v_x * delta_time;
        this.y += this.v_y * delta_time;

        // collision detection with walls
        this.x = Math.max(node_radius, Math.min(this.x, canvas.width - node_radius));
        this.y = Math.max(node_radius, Math.min(this.y, canvas.height - node_radius));

        this.x_accel = 0;
        this.y_accel = gravity;
    }
}

class Spring{
    constructor(node1, node2, rest_length, stiffness){
        // node 1 and node 2 are the two nodes on the ends of the spring.
        this.node1 = node1;
        this.node2 = node2;
        this.rest_length = rest_length;
        this.stiffness = stiffness;
    }
    
    next(){
        // this part just draws the spring.
        let pos_1 = nodes[this.node1].getPos();
        let pos_2 = nodes[this.node2].getPos();
        
        ctx.beginPath();
        ctx.moveTo(pos_1[0], pos_1[1]);
        ctx.lineTo(pos_2[0], pos_2[1]);
        ctx.stroke();
    }

    accelNodes(){
        let pos_1 = nodes[this.node1].getPos();
        let pos_2 = nodes[this.node2].getPos();
        let displacement = [pos_1[0] - pos_2[0], pos_1[1] - pos_2[1]];
        let distance = Math.sqrt(displacement[0] ** 2 + displacement[1] ** 2);
        let force = (distance - this.rest_length) * this.stiffness;
        nodes[this.node1].addForce(displacement.map(x => x * -force/distance));
        nodes[this.node2].addForce(displacement.map(x => x * force/distance));
    }
}

class Body{
    constructor(node_pos){
        this.x = 0;
        this.y = 0;
        this.node_pos = node_pos;
        this.body_nodes = [];
        this.x_bounds = [0,0];
        this.y_bounds = [0,0];

        // this part actually creates all of the nodes, because node_pos is a list of positions.
        for (let n = 0; n < node_pos.length; n++){
            let positions = node_pos[n];
            this.body_nodes.push(new Node(...positions));
            nodes.push(this.body_nodes[this.body_nodes.length - 1])

            // this part finds the x and y bounds of the body,
            // so that it doesn't clip off of the screen when you set its position.
            this.x_bounds = [Math.min(this.x_bounds[0], positions[0]),
                             Math.max(this.x_bounds[1], positions[0])];
            this.y_bounds = [Math.min(this.y_bounds[0], positions[1]),
                             Math.max(this.y_bounds[1], positions[1])];
        }
    }

    getBounds(){
        return {x: this.x_bounds, y: this.y_bounds};
    }
    
    move(coords){
        // clears the screen.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.body_nodes.forEach(obj => obj.moveTo(coords));
      
        // shows everything again
        springs.forEach(obj => obj.next());
        nodes.forEach(obj => obj.show());
    }

    set(){
        // this is for when the final position of the body is set.
        // it calls the "set" function for every node.
        this.body_nodes.forEach(obj => obj.set());
    }
}

function update(){
    // clear the screen.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // accelerate the nodes
    springs.forEach(obj => obj.accelNodes());

    // handle node movement
    nodes.forEach(obj => obj.next());
    for(let node1 = 0; node1 < nodes.length; node1 ++){
        for(let node2 = node1 + 1; node2 < nodes.length; node2 ++){
            let pos_1 = nodes[node1].getPos();
            let pos_2 = nodes[node2].getPos();
            let displacement = [pos_1[0] - pos_2[0], pos_1[1] - pos_2[1]];
            let distance = Math.sqrt(displacement[0] ** 2 + displacement[1] ** 2);

            // if colliding, go away
            if (distance < (2 * node_radius)){
                nodes[node1].collision(
                    displacement.map(x => x * (2 * node_radius - distance)/distance));
                nodes[node2].collision(
                    displacement.map(x => x * (distance - 2 * node_radius)/distance));
            }
        }
    }

    // this shows the objects
    springs.forEach(obj => obj.next());
    nodes.forEach(obj => obj.show());
}

// for starting and stopping the simulation
function startPressed() {
    // "Loop" is the main loop of the whole simulation,
    // so we can check it to see if it is currently running.
    if (Loop != null){
        // if the simulation is currently running
        clearInterval(Loop)
        Loop = null
      
        document.getElementById("startButton").innerHTML = "Start";

        // reset everything
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nodes.forEach(obj => obj.reset());
        springs.forEach(obj => obj.next());
        nodes.forEach(obj => obj.show());
    } else {
        // simulation needs to start
        Loop = setInterval(update, 1000 * delta_time);
        document.getElementById("startButton").innerHTML = "Stop";
    }
}

function clearPressed(){
    // clears all of the objects from the arrays and from the display
    while (nodes.length > 0) nodes.pop();
    while (springs.length > 0) springs.pop();
    while (objects.length > 0) objects.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (Loop != null){
      // if it is currently running, stop it
      startPressed();
    }
}


// GENERATION STUFF


// for generating n-gon NODE positions (not springs)
function generatePolygon(num_layers, sides){
    // for now, it assumes that "layer_seperation" is 0.
    
    let node_positions = [];
  
    // the center node
    node_positions.push([[0,0]]);
  
    for(let layer = 1; layer < num_layers; layer ++){
        layer_list = [];

        for(let spoke = 0; spoke < sides; spoke ++){
            // making the "spokes", which are the nodes that are on lines that go directly out from the center
            // here's an example: https://www.desmos.com/calculator/dg1tjsryha
            let last_spoke = [Math.cos(spoke / sides * 2 * Math.PI) * layer,
                              Math.sin(spoke / sides * 2 * Math.PI) * layer];
            let next_spoke = [Math.cos((spoke + 1) / sides * 2 * Math.PI) * layer,
                              Math.sin((spoke + 1) / sides * 2 * Math.PI) * layer];

            layer_list.push(last_spoke);

            // this part makes the nodes in between the spokes.
            // it takes the weighted average of the two spoke positions to create new positions.
            for(let inbetween = 0; inbetween < layer - 1; inbetween ++){
                averaged_x = (last_spoke[0] *
                              (1 - ((inbetween + 1) / layer)) +
                              next_spoke[0] *
                              (inbetween + 1) / layer);
                
                averaged_y = (last_spoke[1] * 
                              (1 - ((inbetween + 1) / layer)) +
                              next_spoke[1] *
                              (inbetween + 1) / layer);
                layer_list.push([averaged_x, averaged_y]);
            }
            
        }
        node_positions.push(layer_list);
    }
    return node_positions
}

// for physically making n-gons
function fillPolygon(layers, sides, layer_seperation, stiffness){
    // this bit gets the right settings from the inputs if they are not provided.
    if (layers === false){
        layers = document.getElementById("radius").value;
        sides = document.getElementById("sides").value;
        layer_seperation = document.getElementById("seperation").value;
        stiffness = document.getElementById("stiffness").value;
    }

    // these store where the nodes for each layer start / end
    let last_layer_index = nodes.length;
    let this_layer_index = nodes.length + 1;

    // this creates the center node and the other nodes
    let new_body_nodes = [];
    new_body_nodes.push([0,0]);
    let positions = generatePolygon(layers, sides);
  
    // adding the nodes to a new list (remnant from when there were no bodies)
    for(let layer = 1; layer < layers; layer ++){
        for(let layer_index = 0; layer_index < layer * sides; layer_index ++){
            new_body_nodes.push([positions[layer][layer_index][0]
                                 * layer_seperation,
                                 positions[layer][layer_index][1]
                                 * layer_seperation]);
        }
    }
    // creating the springs
    for(let layer = 1; layer < layers; layer ++){
        let side_spring_length = 2 * Math.sin(Math.PI / sides);
        for(let layer_node = 0; layer_node < layer * sides; layer_node ++){
            
            // creating the springs in between the nodes in each layer
            springs.push(new Spring(layer_node + this_layer_index,
                                    this_layer_index + (layer_node + 1)
                                    % (layer * sides),
                                    side_spring_length * layer_seperation,
                                    stiffness));

            // creating the springs between layers
            let last_layer_spring = layer_node * (layer - 1) / layer;
            if(last_layer_spring % 1 == 0){
                // creating the springs on the 'spokes'
                springs.push(new Spring(layer_node + this_layer_index,
                                        last_layer_index +
                                        last_layer_spring,
                                        layer_seperation,
                                        stiffness));
            } else {
                // creating all the other springs
                // this creates two springs for each node except for the ones on the "spokes"
                // one of the springs goes to the node on the bottom-left, the other one the bottom-right
                // where "bottom" refers to towards the center of the polygon
                springs.push(new Spring(layer_node + this_layer_index,
                                        last_layer_index +
                                        Math.ceil(last_layer_spring)
                                        % ((layer - 1) * sides),
                                        layer_seperation,
                                        stiffness));
                springs.push(new Spring(layer_node + this_layer_index,
                                        last_layer_index +
                                        Math.floor(last_layer_spring),
                                        layer_seperation,
                                        stiffness));
            }
        }

        // updates the layers
        last_layer_index += sides * (layer == 1 ? 1 / sides : (layer - 1));
        this_layer_index += sides * layer;
    }

    // create new object                                                                                        
    return new_body_nodes;
}


// for making boxes
function makeBox(box_width, box_height, unit_width, stiffness){
    // this bit gets the right settings from the inputs if they are not provided.
    if (box_width === false){
        box_width = document.getElementById("x-size").value;
        box_height = document.getElementById("y-size").value;
        layer_seperation = document.getElementById("seperation").value;
        stiffness = document.getElementById("stiffness").value;
    }

    index = nodes.length;
    let new_body_nodes = [];

    // these two nested for loops make a 2D array of size: box_width by box_height
    // each element corresponds to a node
    for(let row = 0; row < box_height; row++){
        for(let col = 0; col < box_width; col++){
            new_body_nodes.push([unit_width * col -
                                 unit_width / 2 * (box_width - 1),
                                 row * unit_width + 5 -
                                 unit_width / 2 * (box_height - 1)]);
            
            // creating the springs
            if(row != 0){
                // meaning: if you aren't in the top row, create a spring to the node above you
                springs.push(new Spring(index,
                                        index - box_width,
                                        unit_width,
                                        stiffness));
                if(col != 0){
                    // then, if you aren't in the left column
                    // create a spring to your left and to your top left
                    springs.push(new Spring(index,
                                            index - box_width - 1,
                                            unit_width * Math.sqrt(2),
                                            stiffness));
                    springs.push(new Spring(index - 1,
                                            index - box_width,
                                            unit_width * Math.sqrt(2),
                                            stiffness));
                }
            }
            if(col != 0){
                // even if you are in the first row,
                // you should still create a spring to the node on your left
                springs.push(new Spring(index,
                                        index - 1,
                                        unit_width,
                                        stiffness));
            }
            
            index++;
        }
    }
    
    // create new object
    return new_body_nodes;
}


// UI STUFF


let mousePos = {x:0, y:0};
let waitingInterval = null;
let settingInterval = null;

function updateMousePos(event){
    // rect has to be done every time this is called
    // so that scrolling doesn't affect the position
    let rect = canvas.getBoundingClientRect();
    
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
}

let ismouseDown = false;
function mouseChange(e, down){
    // only having one function creates some problems
    // if you change the mouse statistics outside of the canvas,
    // it doesn't update. This means that this could get locked
    // into ismouseDown = true if you hold and release your mouse outside the canvas.
    ismouseDown = (down !== 0);
}

// creates a new Body, not a new Object
function addObject(a, b, width, stiffness, type){
    let curr_object = null;
    // switch statement is basically an if statement but for many cases  
    switch (type) {
    case 'box':
        curr_object = new Body(makeBox(a, b, width, stiffness));
        break;
    case 'polygon':
        curr_object = new Body(fillPolygon(a, b, width, stiffness));
        break;
    default:
        // this is if no other case works
        console.log(type);
        break;
    }
    objects.push(curr_object);

    // set the body's position every 10 milliseconds
    settingInterval = setInterval(() => setObject(param), 10);
}

function setObject(body){
    let bounds = body.getBounds();
    let rectifiedMousePos = {...mousePos}
    
    // making sure the object doesn't go over the sides with the bounds
    rectifiedMousePos.x = (Math.max
                           (0,rectifiedMousePos.x + bounds.x[0])
                           - bounds.x[0]);
    rectifiedMousePos.x = (Math.min
                           (canvas.width, rectifiedMousePos.x + bounds.x[1])
                           - bounds.x[1]);
    
    rectifiedMousePos.y = (Math.max
                           (0, rectifiedMousePos.y + bounds.y[0])
                           - bounds.y[0]);
    rectifiedMousePos.y = (Math.min
                           (canvas.height, rectifiedMousePos.y + bounds.y[1])
                           - bounds.y[1]);
    
    body.move(rectifiedMousePos);

    if (ismouseDown){
        clearInterval(settingInterval);
        settingInterval = null;
      
        // set the final position of the body
        body.set();
    }
}
