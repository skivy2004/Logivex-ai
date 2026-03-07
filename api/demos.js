export default async function handler(req, res) {
    res.status(200).json([
      {
        id: "email-extraction",
        name: "Email → Transport Order Extraction",
        status: "online"
      },
      {
        id: "transport-quote",
        name: "AI Transport Quote Generator",
        status: "online"
      }
    ]);
  }