PARENT_BRANCH=$(git branch --show-current)

cd prisma
git checkout -b $PARENT_BRANCH
git pull origin $PARENT_BRANCH
git push origin $PARENT_BRANCH
cd ..

cd src/util/defs
git checkout -b $PARENT_BRANCH
git pull origin $PARENT_BRANCH
git push origin $PARENT_BRANCH
cd ../../../
