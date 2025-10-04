import { useNavigate } from 'react-router-dom';
import { People, Group, Clock, Home, Gear, Help } from '../components/Icons';

export default function Menu(){
  const nav = useNavigate();
  return (
    <div className="safe">
      <div className="menu-title">メニュー</div>
      <div className="grid6">
        <button className="tile gold" onClick={()=>nav('/solo')}>
          <People/><div className="label">一人で合コン</div>
        </button>
        <button className="tile gold" onClick={()=>nav('/friends')}>
          <Group/><div className="label">友達と合コン</div>
        </button>
        <button className="tile" onClick={()=>nav('/flow')}>
          <Clock/><div className="label">合コンの流れ</div>
        </button>
        <button className="tile" onClick={()=>nav('/about')}>
          <Home/><div className="label">サービス概要</div>
        </button>
        <button className="tile" onClick={()=>nav('/mypage')}>
          <Gear/><div className="label">マイページ</div>
        </button>
        <button className="tile" onClick={()=>nav('/faq')}>
          <Help/><div className="label">よくある質問</div>
        </button>
      </div>
      <div className="footer-note">© thematching</div>
    </div>
  );
}
