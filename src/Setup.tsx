import React, { useEffect, useState } from "react";
import { getAccessToken } from "../liff";
import { apiGet, apiPost } from "../api";

type Prefs = {
  style: string;
  type: string;
  place: string;
  cost: string;
  date: string;
};

export default function Setup() {
  const [prefs, setPrefs] = useState<Prefs>({
    style: "一人で参加",
    type: "どちらでも良い",
    place: "安ウマ居酒屋",
    cost: "全員で割り勘がいい",
    date: "",
  });
  const [status, setStatus] = useState<string>("loading");

  // 初期ロード：サーバから設定を取得
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        console.log("[Setup] access token =", token);

        if (!token) {
          setStatus("no access token");
          return;
        }

        const res = await apiGet("/prefs", token);
        console.log("[Setup] GET /prefs response =", res);

        if (res && res.prefs) {
          setPrefs(res.prefs);
        }
        setStatus("ready");
      } catch (err: any) {
        console.error("[Setup] prefs get failed", err);
        setStatus("prefs get failed: " + (err.message || "error"));
      }
    })();
  }, []);

  // 保存処理
  const savePrefs = async () => {
    try {
      const token = await getAccessToken();
      console.log("[Setup] saving prefs with token", token);

      const res = await apiPost("/prefs", prefs, token);
      console.log("[Setup] POST /prefs response =", res);

      alert("保存しました！");
    } catch (err: any) {
      console.error("[Setup] prefs save failed", err);
      alert("保存に失敗しました: " + (err.message || "error"));
    }
  };

  return (
    <div style={{ padding: "20px", color: "white", background: "black" }}>
      <h2>合コン設定</h2>
      <p>{status}</p>

      <label>参加スタイル：</label>
      <select
        value={prefs.style}
        onChange={(e) => setPrefs({ ...prefs, style: e.target.value })}
      >
        <option>一人で参加</option>
        <option>友達と参加</option>
      </select>
      <br />

      <label>合コンの種類：</label>
      <select
        value={prefs.type}
        onChange={(e) => setPrefs({ ...prefs, type: e.target.value })}
      >
        <option>どちらでも良い</option>
        <option>話す（居酒屋/ダイニング）</option>
        <option>遊ぶ（シーシャ/ダーツ）</option>
      </select>
      <br />

      <label>お店について：</label>
      <select
        value={prefs.place}
        onChange={(e) => setPrefs({ ...prefs, place: e.target.value })}
      >
        <option>安ウマ居酒屋</option>
        <option>お洒落ダイニング</option>
        <option>BAR/夜カフェ</option>
      </select>
      <br />

      <label>合コン費用：</label>
      <select
        value={prefs.cost}
        onChange={(e) => setPrefs({ ...prefs, cost: e.target.value })}
      >
        <option>男性が全て払う</option>
        <option>全員で割り勘がいい</option>
        <option>相手に合わせる</option>
      </select>
      <br />

      <label>合コン参加日：</label>
      <input
        type="date"
        value={prefs.date}
        onChange={(e) => setPrefs({ ...prefs, date: e.target.value })}
      />
      <br />

      <button onClick={savePrefs} style={{ marginTop: "10px" }}>
        条件を保存して、この日のスロットを検索
      </button>
    </div>
  );
}