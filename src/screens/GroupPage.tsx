import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGroupByToken, type GroupPageResponse } from "../api";

type Member = GroupPageResponse["members"][number];

export default function GroupPage() {
  const { token } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupPageResponse["group"] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const r = await getGroupByToken(token);
        setGroup(r.group);
        setMembers(r.members || []);
      } catch (e: any) {
        console.error("[group] load error", e);

        const msg = String(e?.message || "");
        if (msg.includes("404") && msg.includes("group_expired")) {
          setError("このグループページは有効期限が切れています。");
        } else {
          setError("このページは無効です。");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return <div className="p-6 text-gray-600">読み込み中…</div>;
  }

  if (error || !group) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-medium">{error || "このページは無効です。"}</div>
        <button
          onClick={() => nav("/")}
          className="mt-4 px-4 py-2 rounded-lg bg-black text-white"
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  const typeJp =
    group.type_mode === "wine_talk"
      ? "ワインの話をしたい"
      : "ワイン以外の話もしたい";

  const slotStr = new Date(group.slot_dt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // v0は固定表示（後で location→日本語表記マップに）
  const locJp = group.location === "shibuya_shinjuku" ? "渋谷・新宿エリア" : group.location;

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-6 bg-white text-gray-900">
      <h1 className="text-xl font-semibold">マッチングが成立しました！</h1>

      {/* 基本情報 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-2">
        <div>
          <div className="text-sm text-gray-500">開催日時</div>
          <div className="font-medium">{slotStr}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">会のタイプ</div>
          <div className="font-medium">{typeJp}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500">場所</div>
          <div className="font-medium">{locJp}</div>
        </div>
      </section>

      {/* メンバー一覧 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
        <div className="font-medium mb-3">メンバー</div>

        <div className="space-y-4">
          {members.map((m) => {
            const genderJp = m.gender === "male" ? "男性" : m.gender === "female" ? "女性" : String(m.gender);
            const ageStr = m.age == null ? "—" : `${m.age}歳`;

            return (
              <div key={m.user_id} className="flex items-center gap-4">
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    className="w-16 h-16 rounded-full object-cover"
                    alt="photo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200" />
                )}

                <div>
                  <div className="font-medium">
                    {m.nickname || `User#${m.user_id}`}（{ageStr}）
                  </div>
                  <div className="text-sm text-gray-500">{genderJp}</div>
                  {m.occupation ? (
                    <div className="text-sm text-gray-500">{m.occupation}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="text-sm text-gray-500">※ チャット機能は現在準備中です</div>
    </div>
  );
}