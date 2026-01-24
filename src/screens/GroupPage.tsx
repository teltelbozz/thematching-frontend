// frontend/src/screens/GroupPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGroupByToken, type GroupPageResponse } from "../api";

type Member = GroupPageResponse["members"][number];

function formatJst(dtIso: string) {
  const d = new Date(dtIso);
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeModeToJp(typeMode: string) {
  if (typeMode === "wine_talk") return "ワインの話をしたい";
  if (typeMode === "wine_and_others") return "ワイン以外の話もしたい";
  return typeMode;
}

function locationToJp(location: string) {
  if (location === "shibuya_shinjuku") return "渋谷・新宿エリア";
  return location;
}

function genderToJp(g: string) {
  if (g === "male") return "男性";
  if (g === "female") return "女性";
  return g;
}

function GenderChip({ gender }: { gender: string }) {
  const label = genderToJp(gender);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs ring-1 ring-gray-200 bg-gray-50 text-gray-700">
      {label}
    </span>
  );
}

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

  const slotStr = useMemo(() => {
    if (!group?.slot_dt) return "";
    return formatJst(group.slot_dt);
  }, [group?.slot_dt]);

  const expiresStr = useMemo(() => {
    if (!group?.expires_at) return null;
    return formatJst(group.expires_at);
  }, [group?.expires_at]);

  if (loading) {
    return <div className="p-6 text-gray-600">読み込み中…</div>;
  }

  if (error || !group) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-medium">
          {error || "このページは無効です。"}
        </div>
        <button
          onClick={() => nav("/")}
          className="mt-4 px-4 py-2 rounded-lg bg-black text-white"
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  const typeJp = typeModeToJp(group.type_mode);
  const locJp = locationToJp(group.location);

  return (
    <div className="max-w-screen-sm mx-auto p-4 space-y-6 bg-white text-gray-900">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">マッチングが成立しました！</h1>
        <div className="text-sm text-gray-500">
          このページはURLを知っている人が閲覧できます（共有に注意してください）。
        </div>
      </header>

      {/* 基本情報 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
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

        {expiresStr ? (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">ページ有効期限</div>
            <div className="text-sm text-gray-700">{expiresStr} まで</div>
          </div>
        ) : null}
      </section>

      {/* 運営からのお知らせ */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-2">
        <div className="font-medium">運営からのお知らせ</div>

        {(!group.venue_name && !group.fee_text && !group.venue_map_url && !group.notes && !group.venue_address) ? (
          <div className="text-sm text-gray-500">準備中です。決まり次第、このページでご案内します。</div>
        ) : (
          <div className="space-y-2">
            {group.venue_name ? (
              <div>
                <div className="text-sm text-gray-500">お店</div>
                <div className="font-medium">{group.venue_name}</div>
              </div>
            ) : null}

            {group.venue_address ? (
              <div>
                <div className="text-sm text-gray-500">住所</div>
                <div className="text-sm">{group.venue_address}</div>
              </div>
            ) : null}

            {group.venue_map_url ? (
              <a
                href={group.venue_map_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-black text-white"
              >
                地図を開く
              </a>
            ) : null}

            {group.fee_text ? (
              <div>
                <div className="text-sm text-gray-500">料金</div>
                <div className="text-sm">{group.fee_text}</div>
              </div>
            ) : null}

            {group.notes ? (
              <div>
                <div className="text-sm text-gray-500">注意事項</div>
                <div className="text-sm whitespace-pre-wrap">{group.notes}</div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* メンバー一覧 */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
        <div className="font-medium mb-3">メンバー</div>

        <div className="space-y-4">
          {members.map((m) => {
            const ageStr = m.age == null ? "—" : `${m.age}歳`;
            const nickname = m.nickname || `User#${m.user_id}`;

            return (
              <div key={m.user_id} className="flex items-center gap-4">
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    className="w-16 h-16 rounded-full object-cover ring-1 ring-gray-200"
                    alt="photo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 ring-1 ring-gray-200" />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">
                      {nickname}（{ageStr}）
                    </div>
                    <GenderChip gender={m.gender} />
                  </div>

                  {m.occupation ? (
                    <div className="text-sm text-gray-500 truncate">
                      職業：{m.occupation}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">職業：—</div>
                  )}
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