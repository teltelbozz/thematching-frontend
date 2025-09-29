import { useState } from "react";
import { updateProfile } from "./api";

type Props = {
  onSaved: () => void; // 保存成功後に呼ぶ（App.tsxでSetup表示に切り替える）
};

export default function ProfileForm({ onSaved }: Props) {
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");

  const handleSave = async () => {
    try {
      await updateProfile({
        nickname,
        age: Number(age),
        gender,
        occupation,
      });
      alert("プロフィールを保存しました");
      onSaved();
    } catch (err) {
      console.error(err);
      alert("プロフィール保存に失敗しました");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>プロフィール登録</h2>

      <div>
        <label>ニックネーム</label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </div>

      <div>
        <label>年齢</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      <div>
        <label>性別</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">選択してください</option>
          <option value="male">男性</option>
          <option value="female">女性</option>
        </select>
      </div>

      <div>
        <label>職業</label>
        <input
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
        />
      </div>

      <button onClick={handleSave}>保存する</button>
    </div>
  );
}