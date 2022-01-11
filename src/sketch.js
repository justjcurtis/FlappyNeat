let bg;
let world
let start = false
let playing = false
let showChamp = false
let aiCheckbox;
let champCheckbox;
let speedSlider
let popSize = 1000
let showSize = 100

const pause = () => {
    start = false
}

const aiCheckedEvent = () => {
    playing = !playing
    start = false
    world = new World(popSize, showSize, pause, playing)
}
const champCheckedEvent = () => {
    showChamp = !showChamp
}

function setup() {
    // createCanvas(480, 720)
    createCanvas(windowWidth, windowHeight - 50)
    bg = loadImage('../assets/background.jpg');
    world = new World(popSize, showSize, pause, playing)
    aiCheckbox = createCheckbox('AI', !playing);
    aiCheckbox.changed(aiCheckedEvent);

    champCheckbox = createCheckbox('Only Champ', showChamp);
    champCheckbox.changed(champCheckedEvent);

    speedSlider = createSlider(1, 100, 1);
    speedSlider.position(190, height + 6);
    speedSlider.style('width', '200px');
}

function draw() {
    if (start) {
        world.update(speedSlider.value())
    }
    background(bg)
    world.render(showChamp)
}

function keyPressed() {
    if (key == ' ') {
        if (!start) {
            start = true
        }
        world.jump()
    }
}

let isTouching = false
const handleTouch = (ms = 200) => {
    if (isTouching == true) return
    isTouching = true
    if (mouseX < width && mouseY < height) {
        if (!start) {
            start = true
        }
        world.jump()
    }
    setTimeout(() => { isTouching = false }, ms)
}


function touchStarted() {
    handleTouch()
}

function createMetaTag() {
    let meta = createElement('meta');
    meta.attribute('name', 'viewport');
    meta.attribute('content', 'user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1,width=device-width,height=device-height');

    let head = select('head');
    meta.parent(head);
}