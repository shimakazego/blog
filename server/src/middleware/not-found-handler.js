export const notFoundHandler = (_req, res) => {
    res.status(404).json({
        message: "Route not found"
    })
}
