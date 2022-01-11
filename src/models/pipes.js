class Pipes {
    constructor() {
        this.pipes = []
        this.addInitialPipes()
    }
    addInitialPipes() {
        let x = 250
        while (x < width - 110) {
            this.addPipe(height / 2, x)
            x += (200 + Math.floor(Math.random() * 220))
        }
    }

    getNextPipeXY() {
        if (this.pipes.length == 0) return [1.5, 0.5, 0.6]
        const p = this.pipes.filter(p => (p.x >= -20 && p.x < width))[0]
        if (p == undefined) return [1.5, 0.5, 0.6]
        return [(p.x - 120) / 120, p.y / height, (p.y + p.gap) / height]
    }

    addPipe(prevY, x = width) {
        if (prevY == undefined) prevY = height / 2;
        const y = prevY + ((((+(Math.random() < 0.5)) * 2) - 1) * height / 3) * Math.random()
        const gap = 100 + Math.floor(Math.random() * 200);
        const pipe = new Pipe(x, y, gap)
        this.pipes.push(pipe)
    }

    collides(y) {
        if (this.pipes.length == 0) return false
        const p = this.pipes.filter(p => (p.x >= -20 && p.x <= 120))[0]
        if (p == undefined) return false
        return ((y + 30 <= p.y + 30) || (y + 30 >= p.y + p.gap))
    }

    update() {
        // remove pipes that are off left side of screen
        this.pipes = this.pipes.filter(p => p.x > -110)

        if (this.pipes.length == 0) {
            this.addPipe()
        }

        const lastPipeX = this.pipes[this.pipes.length - 1].x
        const lastPipeY = this.pipes[this.pipes.length - 1].y
        if (lastPipeX <= width - 220) {
            if (Math.random() < 0.02) {
                this.addPipe(lastPipeY)
            }
        }
        for (let i = 0; i < this.pipes.length; i++) {
            this.pipes[i].update()
        }
    }

    render() {
        for (let i = 0; i < this.pipes.length; i++) {
            this.pipes[i].render()
        }
    }
}