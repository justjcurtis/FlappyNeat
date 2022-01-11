class Bird {
    constructor(img, brain) {
        this.x = 70
        this.y = height / 2
        this.vel = 0
        this.brain = null
        this.score = 0
        this.dead = false
        this.brain = brain
        this.img = img
    }

    jump() {
        this.vel = -10
    }

    getInput(input) {
        const i = input.slice(0)
        i[1] = (this.y / height) - i[1]
        i[2] = i[2] - (this.y / height)
        return [...i, this.vel / 10, this.y / height]
    }

    update(input) {
        if (this.dead) return
        if (this.brain != undefined) {
            const output = this.brain.predict(this.getInput(input))[0]
            if (output > 0.5) this.jump()
        }
        this.score += 0.01
        if (this.y - 25 > height || this.y + 25 < 0) this.dead = true
        this.y += this.vel
        this.vel += 1
        if (this.vel < -10) this.vel = -10
        if (this.vel > 20) this.vel = 20
    }

    render() {
        if (this.img == undefined) return
        if (this.dead) return
        let angle = (this.vel / 40) * 50
        if (angle > 50) angle = 50
        if (angle < -50) angle = -50
        push()
        imageMode(CENTER)
        translate(this.x + 35, this.y + 35)
        rotate(PI / 180 * angle);
        image(this.img, 0, 0, 70, 70)
        pop()
    }
}