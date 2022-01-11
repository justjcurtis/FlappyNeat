const min = 50
class Pipe {
    constructor(x, y, gap = 50) {
        this.x = x
        this.y = y > height - gap - 60 - min ? height - (60 + min + gap) : y < min ? min : y
        this.gap = gap
    }

    update() {
        this.x -= 2
    }

    renderTop() {
        strokeWeight(2)
        fill(0, 200, 0)
        rect(this.x, this.y, 110, 30, 5);
        fill(0, 200, 0)
        rect(this.x + 5, 0, 100, this.y);
        strokeWeight(0)
        fill(0, 150, 0)
        rect(this.x + 6, this.y - 4, 98, 4);
    }

    renderBottom() {
        strokeWeight(2)
        fill(0, 200, 0)
        rect(this.x, this.y + this.gap + 30, 110, 30, 5);
        fill(0, 200, 0)
        rect(this.x + 5, this.y + this.gap + 60, 100, height - this.y + this.gap);
        strokeWeight(0)
        fill(0, 100, 0)
        rect(this.x + 6, this.y + this.gap + 60, 98, 4);
    }

    render() {
        this.renderTop()
        this.renderBottom()
    }
}