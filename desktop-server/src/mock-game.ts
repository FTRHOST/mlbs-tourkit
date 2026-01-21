import net from 'net';

const PORT = 12345;
const MOCK_DATA = {
    type: "update",
    debug: {
        manager_found: true,
        game_state: 4,
        feature_enabled: true
    },
    data: {
        room_info: {
            player_count: 10,
            players: [
                { lUid: 2055252516, _sName: "TestBlue1", iCamp: 1, heroid: 10, banHero: 0 },
                { lUid: 99, _sName: "TestRed1", iCamp: 2, heroid: 60, banHero: 0 }
            ]
        },
        battle_stats: {
            time: 120.5,
            m_iCampAKill: 5,
            m_iCampBKill: 3,
            m_CampAGold: 15000,
            m_CampBGold: 14000
        }
    }
};

const server = net.createServer((socket) => {
    console.log('Mock Game Socket: Client connected (GameListener)');
    
    // Send mock data every 2 seconds
    const interval = setInterval(() => {
        console.log('Mock Game Socket: Sending update...');
        socket.write(JSON.stringify(MOCK_DATA) + '\n');
    }, 2000);

    socket.on('end', () => {
        console.log('Mock Game Socket: Client disconnected');
        clearInterval(interval);
    });

    socket.on('error', (err) => {
        console.error('Mock Game Socket error:', err.message);
        clearInterval(interval);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Mock Game Socket listening on 127.0.0.1:${PORT}`);
    console.log('Use this to simulate Android device output for GameListener.');
});
