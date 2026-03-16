import nodeFetch from 'node-fetch';

const url = "https://rwkefswqopnxbekeqsel.supabase.co/storage/v1/object/sign/mrdai/0302(6).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xZTI0NmQyYi02M2FiLTQyYzAtODVkMi1iMzUyMTFjZTNkNWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtcmRhaS8wMzAyKDYpLm1wNCIsImlhdCI6MTc3MjYyNzI0OSwiZXhwIjoxODA0MTYzMjQ5fQ.p0ycZrXxRK5CUunNSdCbghmYDXdaeObUNLA5kJxeRws";

async function test() {
    try {
        const res = await nodeFetch(url);
        console.log("Content-Type:", res.headers.get('content-type'));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

test();
