// Simple token auth (use JWT in prod)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN

router.get('/bookings', (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    Booking.find().sort({ createdAt: -1 }).exec((err, docs) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(docs);
    });
});

router.patch('/bookings/:id', (req, res) => {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Unauthorized' });
    Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
        .then(b => res.json(b))
        .catch(() => res.status(500).json({ error: 'Update failed' }));
});