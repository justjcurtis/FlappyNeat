class World {
    constructor(n, showSize, pause, playing = false) {
        this.pause = pause
        this.n = n
        this.showSize = showSize > n ? n : showSize
        this.birdImage = loadImage('https://raw.githubusercontent.com/justjcurtis/FlappyNeat/main/assets/bird.png')
        this.pipes = new Pipes()
        this.birds = []
        this.dead = []
        this.playerBird = new Bird(this.birdImage)
        this.neat = undefined
        this.playing = playing
        this.started = false
        this.generation = 0
        this.neatVisualiser = undefined
        this.score = 0
        this.initNeat()
        this.addNeatBirds()
    }

    initNeat() {
        this.neat = new Neat(5, 1, this.n, true)
    }

    addNeatBirds() {
        if (this.neat == undefined) this.initNeat()
        const brains = this.neat.pop
        this.neatVisualiser = new NeatVisualiser(width - (height / 4) - 10, height * (3 / 4) - 10, height / 4, height / 4)
        for (let i = 0; i < this.n; i++) {
            this.birds.push(new Bird(this.birdImage, brains[i]))
        }
    }

    updateNeat() {
        this.score = 0
        for (let i = 0; i < this.dead.length; i++) {
            this.dead[i].brain.score = this.dead[i].score
        }
        this.neat.evolve()
        this.n = this.neat.pop.length
        this.dead = []
    }

    update(n) {
        if (!this.started) {
            this.score = 0
            this.started = true
        }
        if (this.playing) n = 1
        for (let i = 0; i < n; i++) {
            this.score += 0.01
            this.pipes.update()
            if (!this.playing) {
                const input = this.pipes.getNextPipeXY()
                this.dead = [...this.dead, ...this.birds.filter(b => b.dead)]
                this.birds = this.birds.filter(b => !b.dead)
                if (this.birds.length == 0) {
                    this.updateNeat()
                    this.pipes = new Pipes()
                    this.addNeatBirds()
                    this.generation++;
                    return
                }
                for (let i = 0; i < this.birds.length; i++) {
                    const dead = this.pipes.collides(this.birds[i].y)
                    if (dead) this.birds[i].dead = true
                    else this.birds[i].update(input)
                }
            } else {
                if (this.playerBird.dead) {
                    this.pause()
                    this.started = false
                    this.pipes = new Pipes()
                    this.playerBird = new Bird(this.birdImage)
                }
                const dead = this.pipes.collides(this.playerBird.y)
                if (dead) this.playerBird.dead = true
                else this.playerBird.update()
            }
        }
    }

    render(showChamp) {
        this.pipes.render()
        if (this.playing) {
            this.playerBird.render()
            stroke(0, 100)
            strokeWeight(2)
            fill(255, 200)
            rect(1, 0, width - 2, 32)
            fill(0, 255)
        }
        if (!this.playing) {
            if (!showChamp) {
                let length = Math.min(this.birds.length, this.showSize)
                for (let i = 0; i < length; i++) {
                    this.birds[i].render()
                }
            } else {
                this.birds[0].render()
            }
            if (this.neatVisualiser != undefined && this.birds != undefined && this.birds.length != 0) {
                const g = this.birds[0].brain.genome
                this.neatVisualiser.render(g)
            }

            stroke(0, 100)
            strokeWeight(2)
            fill(255, 200)
            rect(1, 0, width - 2, 32)
            fill(0, 255)
            text(`Generation: ${this.generation+1}`, 10 + ((1 / 16) * width), 10, 150, 100)
            text(`Population: ${this.neat.pop.length}`, (width / 4) + ((1 / 16) * width), 10, 200, 100)
            text(`    Living: ${this.birds.length}`, (width / 2) + ((1 / 16) * width), 10, 200, 100)
        }
        text(`Score: ${Math.round(this.score)}`, (width * (3 / 4)) + ((1 / 16) * width), 10, 200, 100)
    }

    jump() {
        if (this.playing) this.playerBird.jump()
    }
}