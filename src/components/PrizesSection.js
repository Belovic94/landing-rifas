const prizes = [
  {
    place: '1º Premio',
    description: '1 Televisor 50"',
    image: '',
  },
  {
    place: '2º Premio',
    description: '1 Tablet Samsung Galaxy',
    image: '',
  },
  {
    place: '3º Premio',
    description: '1 Olla Essen',
    image: '',
  },
  {
    place: '4º Premio',
    description: '1 combo de juguetes',
    image: '',
  },
  {
    place: '5º Premio',
    description: '1 Caja de productos Havanna',
    image: '',
  },
  {
    place: '6º Premio',
    description: '1 Combo de reposera y bolso térmico',
    image: '',
  },
];

const PrizesSection = () => (
  <section style={{ background: '#fff', padding: '40px 20px' }}>
    <h2 style={{ color: '#2d3e50', fontSize: '2rem', marginBottom: 20 }}>Premios</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 30 }}>
      {prizes.map((prize, idx) => (
        <div key={idx} style={{ background: '#f5f5f5', borderRadius: 10, padding: 20, minWidth: 220, maxWidth: 300, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          {/* {prize.image && <img src={prize.image} alt={prize.place} style={{ width: '100%', marginBottom: 10 }} />} */}
          <h3 style={{ color: '#e74c3c', margin: '10px 0' }}>{prize.place}</h3>
          <p style={{ color: '#2d3e50', fontSize: '1.1rem' }}>{prize.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default PrizesSection; 