import { getVoiceApiUrl } from "@/lib/config";

export interface VoiceEnrollmentStatus {
  id: string;
  name: string;
  enrollment_status: "enrolled" | "partial" | "not_enrolled";
  enrollment_count: number;
}

export interface VoiceEnrollmentResponse {
  id: string;
  name: string;
  enrollment_status: string;
  enrollment_count: number;
  max_enrollment_count: number;
  remaining_samples: number;
  quality: any;
  completed: boolean;
  can_record_next: boolean;
  next_sample_number: number;
  message: string;
  error?: string;
}

export const voiceApi = {
  getStatus: async (userId: string): Promise<VoiceEnrollmentStatus> => {
    const BASE_URL = await getVoiceApiUrl();
    const response = await fetch(
      `${BASE_URL}/voice/users/${userId}/enrollment-status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          id: userId,
          name: "",
          enrollment_status: "not_enrolled",
          enrollment_count: 0,
        };
      }
      // Handle other errors gracefully if needed, but for now throw
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  },

  enroll: async (
    userId: string,
    audioBlob: Blob
  ): Promise<VoiceEnrollmentResponse> => {
    const BASE_URL = await getVoiceApiUrl();
    const formData = new FormData();
    // Append blob with a filename so backend treats it as a file
    formData.append("audio_file", audioBlob, "recording.wav");

    const response = await fetch(`${BASE_URL}/voice/users/${userId}/enroll`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        // Content-Type is set automatically with boundary
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Enrollment failed");
    }

    return data;
  },

  deleteProfile: async (userId: string): Promise<any> => {
    const BASE_URL = await getVoiceApiUrl();
    const response = await fetch(`${BASE_URL}/voice/users/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete profile: ${response.statusText}`);
    }
    return response.json();
  },
};
