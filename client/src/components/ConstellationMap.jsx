import './ConstellationMap.css';

// 실제 별자리 좌표 (별 위치 + 연결선)
const CONSTELLATIONS = {
  '물병자리': {
    stars: [[30,20],[50,15],[70,22],[45,40],[55,45],[35,60],[65,58],[40,75],[60,72],[50,85]],
    lines: [[0,1],[1,2],[1,3],[2,4],[3,4],[3,5],[4,6],[5,7],[6,8],[7,9],[8,9]],
    bright: [1,3,4],
  },
  '물고기자리': {
    stars: [[15,50],[25,40],[35,35],[50,30],[65,35],[75,30],[85,35],[45,55],[35,65],[25,70],[20,60],[55,55],[65,60],[75,65]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,7],[7,8],[8,9],[9,10],[10,0],[7,11],[11,12],[12,13]],
    bright: [3,7,5],
  },
  '양자리': {
    stars: [[25,45],[40,35],[55,30],[70,35],[80,50]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
    bright: [1,2],
  },
  '황소자리': {
    stars: [[20,30],[35,25],[50,20],[60,30],[70,25],[55,45],[45,50],[35,55],[65,50],[75,55],[80,45]],
    lines: [[0,1],[1,2],[2,3],[2,4],[3,5],[5,6],[6,7],[3,8],[8,9],[8,10]],
    bright: [2,3,5],
  },
  '쌍둥이자리': {
    stars: [[30,15],[35,30],[30,50],[28,70],[32,85],[60,15],[55,30],[60,50],[62,70],[58,85]],
    lines: [[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[8,9],[1,6],[2,7]],
    bright: [0,5],
  },
  '게자리': {
    stars: [[30,30],[45,25],[60,30],[35,50],[55,50],[40,70],[50,70]],
    lines: [[0,1],[1,2],[0,3],[2,4],[3,4],[3,5],[4,6],[5,6]],
    bright: [3,4],
  },
  '사자자리': {
    stars: [[15,40],[30,25],[45,20],[60,25],[70,35],[75,50],[65,60],[50,55],[35,50],[25,55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0]],
    bright: [2,4,7],
  },
  '처녀자리': {
    stars: [[20,25],[35,20],[50,25],[60,35],[70,45],[55,50],[40,55],[30,50],[50,65],[60,75],[45,80]],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[7,0],[5,8],[8,9],[8,10]],
    bright: [2,5,8],
  },
  '천칭자리': {
    stars: [[30,30],[50,25],[70,30],[25,55],[45,50],[55,50],[75,55]],
    lines: [[0,1],[1,2],[3,4],[4,5],[5,6],[0,3],[1,4],[1,5],[2,6]],
    bright: [1,4,5],
  },
  '전갈자리': {
    stars: [[15,35],[25,30],[40,28],[55,32],[65,40],[70,52],[72,65],[68,75],[75,82],[80,78]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
    bright: [3,5,7],
  },
  '사수자리': {
    stars: [[35,20],[50,15],[55,30],[45,40],[60,45],[70,35],[75,50],[40,60],[55,65],[65,70]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,7],[4,8],[8,9],[7,8]],
    bright: [1,4,8],
  },
  '염소자리': {
    stars: [[25,30],[40,20],[55,25],[65,35],[70,50],[60,60],[45,65],[30,55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]],
    bright: [1,3,5],
  },
};

function ConstellationMap({ name, color = '#7C3AED', size = 200, animate = true }) {
  const data = CONSTELLATIONS[name];
  if (!data) return null;

  return (
    <div className="const-map" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="const-svg">
        {/* 배경 글로우 */}
        <defs>
          <radialGradient id={`glow-${name}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`star-blur-${name}`}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        <circle cx="50" cy="50" r="48" fill={`url(#glow-${name})`} />

        {/* 연결선 */}
        {data.lines.map(([a, b], i) => (
          <line key={`l${i}`}
            x1={data.stars[a][0]} y1={data.stars[a][1]}
            x2={data.stars[b][0]} y2={data.stars[b][1]}
            stroke={color} strokeWidth="0.5" strokeOpacity="0.4"
            className={animate ? 'const-line' : ''}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}

        {/* 별 글로우 */}
        {data.stars.map(([x, y], i) => (
          <circle key={`g${i}`}
            cx={x} cy={y}
            r={data.bright.includes(i) ? 4 : 2.5}
            fill={color}
            opacity={data.bright.includes(i) ? 0.3 : 0.15}
            filter={`url(#star-blur-${name})`}
          />
        ))}

        {/* 별 */}
        {data.stars.map(([x, y], i) => (
          <circle key={`s${i}`}
            cx={x} cy={y}
            r={data.bright.includes(i) ? 2 : 1.2}
            fill="#fff"
            className={animate ? 'const-star' : ''}
            style={{ animationDelay: `${i * 100 + 500}ms` }}
          />
        ))}

        {/* 밝은 별 추가 광채 */}
        {data.bright.map((idx, i) => (
          <circle key={`b${i}`}
            cx={data.stars[idx][0]} cy={data.stars[idx][1]}
            r="1"
            fill="#fff"
            className="const-star-bright"
            style={{ animationDelay: `${i * 300}ms` }}
          />
        ))}
      </svg>
    </div>
  );
}

export { CONSTELLATIONS };
export default ConstellationMap;
