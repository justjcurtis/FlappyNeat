class NeatVisualiser {
    constructor(x, y, w, h) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.brain
    }

    render(g) {
        push()
        stroke(1, 100);
        strokeWeight(2)
        fill(0, 0, 0, 100)
        rect(this.x, this.y, this.w, this.h)
        const xSpace = (this.w / g.layers.length)
        fill(255, 0, 0, 100)
        stroke(0, 100)
        strokeWeight(2)
        const nodeMap = {}
        for (let i = 0; i < g.layers.length; i++) {
            const ySpace = (this.h / g.layers[i].length)
            const yTop = (ySpace / 2 + 0)
            for (let j = 0; j < g.layers[i].length; j++) {
                const x = this.x + (i * xSpace) + xSpace / 2
                const y = this.y + yTop + (j * ySpace)
                nodeMap[g.layers[i][j].id] = [x, y]
                ellipse(x, y, 10)
            }
        }
        for (let i = 0; i < g.connections.length; i++) {
            const con = g.connections[i]
            if (!con.enabled) continue
            const sw = (sigmoid(con.weight) * 2) + 2
            strokeWeight(sw)
            if (sw > 2) stroke(0, 100)
            else stroke(0, 100)
            if (con.isRecurrent()) stroke(0, 0, 255, 100)
            const [x1, y1] = nodeMap[con.inNode]
            const [x2, y2] = nodeMap[con.outNode]
            line(x1 + 5, y1, x2 - 5, y2)
        }
        pop()
    }
}