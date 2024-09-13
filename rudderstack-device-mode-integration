import { sha256 } from "@rs/hash/v1";

// Regular expression for a valid email address
const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function transformBatch(payload, metadata) {
  let hashedEmail = null;

  // Recursive function to find the email and hash it
  function findAndHashEmail(obj) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === 'email' && typeof obj[key] === 'string') {
          const email = obj[key].replace(/\s/g, '').toLowerCase();
          if (emailRegex.test(email)) {
            hashedEmail = sha256(email);
            obj[key] = email; // Replace the email with cleaned email
          }
        } else if (key === 'birthday' && typeof obj[key] === 'string') {
          obj[key] = formatDate(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          findAndHashEmail(obj[key]);
        }
      }
    }
  }

  // Function to format the birthday to YYYY-MM-DD
  function formatDate(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateString; // Return the original string if it's not in DD/MM/YYYY format
  }

  // Recursive function to traverse and modify the payload
  function traverseAndModify(obj) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Replace 'userId' or 'user_id' with the hashed email
        if ((key === 'userId' || key === 'user_id' || key === 'id') && hashedEmail) {
          obj[key] = hashedEmail;
        }

        // Recurse into nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverseAndModify(obj[key]);
        }
      }
    }
  }

  // First, find and hash the email and format the birthday in the payload
  findAndHashEmail(payload);

  // Then, traverse and modify the payload using the hashed email
  if (hashedEmail) {
    traverseAndModify(payload);
  }

  // If 'request_ip' is present, perform geo-location lookup
  if (payload.request_ip) {
    try {
      payload.context.geo = await geolocation(payload.request_ip);
    } catch (e) {
      log(e.message);
    }
  }

  // If traits are present, also modify 'external_id'
  const traits = payload.context?.traits;

  if (traits && traits.email && hashedEmail) {
    traits.external_id = hashedEmail;
  }

  return payload;
}
