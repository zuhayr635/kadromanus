import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const suspects = [
    'Hernández Simeone', 'Ivory Coast', 'Sterling Raheem', 'Muslera Fernando',
    'Simons Ousmane', 'Vinícius José', 'Vinícius López', 'Bruno Gonzales',
    'Fabio Paratici', 'Noel Whelan', 'Batista Mezenga', 'Chery Chakvetadze',
    'Ricky Puig', 'Boubcar Kamara', 'Karim Abed', 'Liam van Gelderen',
    'Arne Slot', 'Sérgio Conceição', 'Lucas Olazábal', 'Ronny Fernández',
    'Marco Rui Costa', 'Andriy Shevchenko', 'Giorgio Chiellini', 'Daniele De Rossi'
  ];

  for (const name of suspects) {
    const [rows] = await conn.query("SELECT id, name, team, overall, cardQuality FROM players WHERE name = ?", [name]);
    if (rows.length > 0) {
      const r = rows[0];
      console.log(`[${r.id}] ${r.name} | ${r.team} | OVR ${r.overall} | ${r.cardQuality}`);
    }
  }

  await conn.end();
}
check();