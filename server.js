const production = process.env.NODE_ENV === 'production';
const clientUrl = production ? 'https://brave-kirch-002ad0.netlify.app' : 'http://localhost:1234';

const io = require('socket.io')((process.env.PORT || 3000), {
  cors: {
    origin: clientUrl,
  },
});
const WORDS = ['Dog', 'Cat', 'Elephant', 'Lion', 'Tiger'];
const rooms = {};

io.on('connection', socket => {
  socket.on('join-room', data => {
    const user = { id: socket.id, name: data.name, socket: socket };
    let room = rooms[data.roomId];
    if (room == null) {
      room = { users: [], id: data.roomId };
      rooms[data.roomId] = room;
    }

    room.users.push(user);
    socket.join(room.id);

    socket.on('ready', () => {
      user.ready = true;
      if (room.users.every(u => u.ready)) {
        room.word = getRandomEntry(WORDS);
        room.drawer = getRandomEntry(room.users);
        io.to(room.drawer.id).emit('start-drawing', room.word);
        room.drawer.socket.to(room.id).emit('start-guessing');
      }
    });

    socket.on('draw', data => {
      socket.to(room.id).emit('draw-line', data.start, data.end, data.color, data.strokeWidth);
    });

    socket.on('make-guess', data => {
      socket.to(room.id).emit('guess', user.name, data.guess);
      if (data.guess.toLowerCase().trim() === room.word.toLowerCase()) {
        io.to(room.id).emit('winner', user.name, room.word);
        room.users.forEach(u => (u.ready = false));
      }
    });

    socket.on('disconnect', () => {
      room.users = room.users.filter(u => u !== user);
    });
  });
});

function getRandomEntry(array) {
  return array[Math.floor(Math.random() * array.length)];
}
