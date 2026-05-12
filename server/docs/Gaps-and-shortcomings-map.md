🔴 Critical vulnerabilities - must be addressed before production

1. There is no following/followers system
getFeed is based on findAll, meaning it fetches all tweets from all users. This is not a "feed" — this is an exploration page. We need a follow table in the schema and a query to filter it by who the user is following. 

2. No Rate Limiting
Anyone can send thousands of requests on /tweets or /login. At least you need express-rate-limit on the POST and auth paths.

3. The Cascade Delete Problem
If you delete a Tweet, what happens to the Comments and Likes associated with it? The plan doesn't mention this. You need to add onDelete: Cascade in the Prisma schema.

🟡 Important shortcomings - affecting quality

4. No Global Error Handler
Each controller handles errors in its own way. A single middleware at the end of app.ts should receive all errors and return a standardized response. Without it, you will get error responses in various forms.

5. No Response Contract
Sometimes it returns { tweet }, sometimes { tweets, total } and sometimes just an object. You must specify a fixed form such as: { success: true, data: {...}, meta?: { page, total } }

6. Offset Pagination breaks down with growth
findMany({ skip: page*limit }) slows down with millions of records. The best solution is cursor-based pagination, especially for feed.

7. No Database Indexes
The schema does not mention indexes. At least you need to:

@@index([authorId]) on Tweet and Comment
@@index([tweetId]) on Like and Comment
@@unique([userId, tweetId]) on Like to prevent duplication

🟠 Design issues

8. Split Routing Comments
The plan itself recognizes this in the WARNING - but the proposed solution complicates maintenance. The best: Put everything under /tweets/:tweetId/comments/:id and get rid of the standalone commentRoutes.

9. The optionalAuth theme after the layout
Used in tweets and user routes but defined as "Step 0". It must be part of the middleware/index.ts file with authGuard from the beginning.

10. IAuthRepository.findByUsername duplicate
The plan mentions creating a separate IUserRepository and this is correct - but it should be clarified whether or not the UserRepository inherits or uses the AuthRepository internals to avoid duplicate queries.

⚪ Acceptable omissions now - but put them on the Roadmap

- Image uploads
- Notifications
- Search
- Logging/Tracing
- helmet middleware




