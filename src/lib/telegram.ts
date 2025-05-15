"use client";

type TelegramNotificationParams = {
  phoneNumber: string;
  message: string;
};

/**
 * Sends a notification message to a Telegram user
 * Uses the Telegram Bot API to send messages
 */
export async function sendTelegramNotification({ phoneNumber, message }: TelegramNotificationParams): Promise<boolean> {
  try {
    // Telegram Bot token from configuration
    const BOT_TOKEN = "7662377324:AAEFhwY-y1q3IrX4OEJAUG8VLa8DqNndH6E"; // AbsensiDigitalBot token
    
    console.log(`Sending Telegram message to ${phoneNumber}: ${message}`);
    
    // Validate the phone number/chat ID
    if (!phoneNumber) {
      console.error("No Telegram chat ID provided");
      return false;
    }
    
    // In Telegram, the chat_id is typically a numeric ID
    // For this implementation, we assume the student.telegramNumber is actually the parent's Telegram chat ID
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: phoneNumber,
        text: message,
        parse_mode: 'HTML'
      }),
    }).catch((err) => {
      console.error("Telegram API error:", err);
      return new Response(JSON.stringify({ ok: false, description: err.message }));
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API returned an error:", data.description);
    }
    return data.ok;
    
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return false;
  }
}

/**
 * Formats an attendance notification message
 */
export function formatAttendanceMessage(student: any, status: string, time: string, date: string): string {
  // Format based on the new requirements
  if (status === 'hadir' || status === 'present') {
    return `Ananda ${student.name} telah hadir di sekolah pada ${date} pukul ${time} WIB.`;
  }
  
  // Keep the old format for non-present statuses
  const statusEmoji = 
    status === 'sakit' || status === 'sick' ? '🤒' :
    status === 'izin' || status === 'permitted' ? '📝' :
    '❌';
  
  const statusText = 
    status === 'sakit' || status === 'sick' ? 'Sakit' :
    status === 'izin' || status === 'permitted' ? 'Izin' :
    'Alpha';
  
  return `
<b>👨‍🎓 INFO KEHADIRAN SISWA</b>
<b>Nama :</b> ${student.name}
<b>NISN :</b> ${student.nisn || '-'}
<b>Kelas :</b> ${student.class || '-'}
<b>Status :</b> ${statusEmoji} <b>${statusText}</b>
<b>Waktu :</b> ${time || '-'}
<b>Tanggal :</b> ${date || '-'}

<i>Pesan ini dikirim otomatis oleh sistem Absensi Digital</i>
  `.trim();
}
