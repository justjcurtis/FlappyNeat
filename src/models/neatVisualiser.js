class NeatVisualiser {
    constructor(x, y, w, h, inpNames, outNames) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.brain
        this.inpNames = inpNames
        this.outNames = outNames
    }

    render(g) {
        push()
        stroke(1, 100);
        strokeWeight(2)
        fill(0, 0, 0, 100)
        const xSpace = (this.w / (g.layers.length + 2))
        rect(this.x, this.y, this.w, this.h)
        const nodeMap = {}
        const hasConnections = {}
        for (let i = 0; i < g.connections.length; i++) {
            const con = g.connections[i]
            if (!con.enabled || con.weight == 0) continue
            hasConnections[con.inNode] = true
            hasConnections[con.outNode] = true
        }
        for (let i = 0; i < g.layers.length; i++) {
            const ySpace = (this.h / g.layers[i].length)
            const yTop = (ySpace / 2 + 0)
            for (let j = 0; j < g.layers[i].length; j++) {
                const x = this.x + ((i * xSpace) + xSpace / 2) + xSpace
                const y = this.y + yTop + (j * ySpace)
                if (i == 0) {
                    const str = this.inpNames[j]
                    fill(0, 100)
                    stroke(0, 100)
                    strokeWeight(1)
                    text(str, x - xSpace, y - 7, 100, 100)
                }
                if (i == g.layers.length - 1) {
                    const str = this.outNames[j]
                    fill(0, 100)
                    stroke(0, 100)
                    strokeWeight(1)
                    text(str, x + xSpace / 2, y - 7, 100, 100)
                }
                const node = g.layers[i][j]
                const hasConnection = hasConnections[node.id]
                nodeMap[node.id] = [x, y]
                stroke(0, 100)
                if (hasConnection) {
                    fill(255, node.activation * 10, node.activation * 10, 100)
                    strokeWeight(2 + ((2 * sigmoid(node.bias)) - 1) * 2)
                } else {
                    fill(100, 100)
                    strokeWeight(0.5)
                }
                ellipse(x, y, 10)
            }
        }
        for (let i = 0; i < g.connections.length; i++) {
            const con = g.connections[i]
            if (!con.enabled || con.weight == 0) continue
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